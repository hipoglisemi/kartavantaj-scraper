
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { enhanceDescription } from '../../services/descriptionEnhancer';
import { isBankCampaign, getBankCampaignReason } from '../../utils/bankCampaignDetector';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { normalizeBankName, normalizeCardName } from '../../utils/bankMapper';
import { optimizeCampaigns } from '../../utils/campaignOptimizer';
import { calculateMissingFields } from '../../utils/aiCalculator';
import { syncHierarchy } from '../../utils/hierarchySync';
import { generateUniqueSlug } from '../../utils/uniqueSlugGenerator';
import { extractDirectly } from '../../utils/dataExtractor';
import { assignBadge } from '../../services/badgeAssigner';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const CARD_CONFIG = {
    name: 'Axess',
    cardName: 'Axess',
    bankName: 'Akbank',
    baseUrl: 'https://www.axess.com.tr',
    listApiUrl: 'https://www.axess.com.tr/ajax/kampanya-ajax.aspx',
    refererUrl: 'https://www.axess.com.tr/kampanyalar',
    apiParams: { 'checkBox': '[0]', 'searchWord': '""' },
    detailSelector: '.cmsContent.clearfix'
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runAxessScraper() {
    const normalizedBank = await normalizeBankName(CARD_CONFIG.bankName);
    const normalizedCard = await normalizeCardName(normalizedBank, CARD_CONFIG.cardName);
    console.log(`\n💳 Starting ${CARD_CONFIG.name} Card Scraper...`);
    console.log(`   Bank: ${normalizedBank}`);
    console.log(`   Card: ${normalizedCard}`);
    console.log(`   Source: ${CARD_CONFIG.baseUrl}\n`);

    // Fetch Master Brands for direct extraction
    console.log('   📚 Fetching master brands for direct matching...');
    const { data: brandsData } = await supabase.from('master_brands').select('name');
    const masterBrands = brandsData?.map(b => b.name) || [];
    console.log(`   ✅ Loaded ${masterBrands.length} brands.`);

    const isAIEnabled = !process.argv.includes('--no-ai'); // AI ENABLED by default, use --no-ai to disable
    const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

    let page = 1;
    let allCampaigns: any[] = [];

    // 1. Fetch List from API
    while (allCampaigns.length < limit) {
        try {
            console.log(`   📄 Fetching page ${page}...`);
            const response = await axios.get(CARD_CONFIG.listApiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': CARD_CONFIG.refererUrl,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                params: {
                    ...CARD_CONFIG.apiParams,
                    'page': page.toString()
                }
            });

            const html = response.data;
            if (!html || html.trim() === '') {
                console.log(`   ✅ Page ${page} is empty. Finished.`);
                break;
            }

            const $ = cheerio.load(html);
            const links = $('.campaingBox a.dLink');

            if (links.length === 0) {
                console.log(`   ✅ No more campaigns. Finished.`);
                break;
            }

            let foundNew = false;
            links.each((_: number, el: any) => {
                const href = $(el).attr('href');
                if (href && allCampaigns.length < limit) {
                    const exists = allCampaigns.some((c: any) => c.href === href);
                    if (!exists) {
                        allCampaigns.push({ href });
                        foundNew = true;
                    }
                }
            });

            console.log(`   ✅ Found ${links.length} campaigns on page ${page}. Total so far: ${allCampaigns.length}`);

            if (!foundNew && page > 1) {
                console.log('   ⚠️ No new campaigns. Stopping.');
                break;
            }

            if (allCampaigns.length >= limit) break;

            page++;
            await sleep(1000);
        } catch (error: any) {
            console.error(`   ❌ Error: ${error.message}`);
            break;
        }
    }

    const campaignsToProcess = allCampaigns.slice(0, limit);
    console.log(`\n🎉 Found ${campaignsToProcess.length} campaigns via scraping.`);

    // 2. Optimize
    const allUrls = campaignsToProcess.map(c => new URL(c.href, CARD_CONFIG.baseUrl).toString());

    console.log(`   🔍 Optimizing campaign list via database check...`);
    const { urlsToProcess } = await optimizeCampaigns(allUrls, normalizedCard);

    // Filter original objects based on optimization
    const finalItems = campaignsToProcess.filter(c => {
        const fullUrl = new URL(c.href, CARD_CONFIG.baseUrl).toString();
        return urlsToProcess.includes(fullUrl);
    });

    console.log(`   🚀 Processing details for ${finalItems.length} campaigns (skipping ${campaignsToProcess.length - finalItems.length} complete/existing)...\n`);

    // 2. Process Details
    for (const item of finalItems) {
        const urlPart = item.href;
        if (!urlPart) continue;

        const fullUrl = new URL(urlPart, CARD_CONFIG.baseUrl).toString();
        console.log(`   🔍 Fetching: ${fullUrl.substring(0, 60)}...`);

        try {
            const detailResponse = await axios.get(fullUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            const html = detailResponse.data;
            const $ = cheerio.load(html);

            const title = $('h2.pageTitle').text().trim() || 'Başlıksız Kampanya';

            // Image Extraction
            const imagePath = $('.campaingDetailImage img').attr('src');
            const imageUrl = imagePath ? new URL(imagePath, CARD_CONFIG.baseUrl).toString() : null;

            // 0. Bank Campaign Detection (Skip AI entirely)
            const isBankCamp = isBankCampaign(title, html);
            let campaignData: any;

            if (isBankCamp) {
                const reason = getBankCampaignReason(title, html);
                console.log(`      🏦 Bank Campaign Detected: ${reason}`);
                console.log(`      ⏭️  Skipping AI, setting sector='diger'`);

                campaignData = {
                    title: title,
                    description: title, // No AI enhancement for bank campaigns
                    image: imageUrl,
                    url: fullUrl,
                    reference_url: fullUrl,
                    card_name: normalizedCard,
                    bank: normalizedBank,
                    category: 'Diğer',
                    sector_slug: 'diger',
                    brand: null,
                    is_bank_campaign: true,
                    classification_method: 'bank_campaign',
                    sector_confidence: 'high',
                    needs_manual_sector: false,
                    is_active: true
                };
            } else {
                // 1. Direct Extraction (Min AI)
                console.log(`      ⚡ Direct: Extracting deterministic fields...`);
                const directData = await extractDirectly(html, title, masterBrands);

                // Core field extraction
                const rawDescription = directData.description || title;
                console.log(`      ✨ Enhancing description with AI...`);
                const enhancedDescription = await enhanceDescription(rawDescription);

                campaignData = {
                    title: title,
                    description: enhancedDescription, // AI-enhanced marketing description
                    image: imageUrl,
                    url: fullUrl,
                    reference_url: fullUrl,
                    card_name: normalizedCard,
                    bank: normalizedBank,
                    category: directData.category || 'Diğer',
                    sector_slug: directData.sector_slug || 'diger',
                    brand: directData.brand,
                    valid_from: directData.valid_from,
                    valid_until: directData.valid_until,
                    min_spend: directData.min_spend || 0,
                    earning: directData.earning,
                    discount: directData.discount,
                    participation_method: directData.join_method,
                    valid_cards: directData.valid_cards, // Mapping extracted cards to valid_cards column
                    is_active: true
                };
            } // End of else block (non-bank campaigns)

            // 1.5 Assign Badge
            const badge = assignBadge(campaignData);
            campaignData.badge_text = badge.text;
            campaignData.badge_color = badge.color;

            // 2. Conditional AI Enhancement (only for non-bank campaigns)
            if (!isBankCamp) {
                const needsAI = !campaignData.brand || !campaignData.valid_until || campaignData.category === 'Diğer' || campaignData.sector_slug === 'diger';

                if (isAIEnabled && needsAI) {
                    console.log(`      🤖 AI: Direct extraction incomplete, calling AI for enrichment...`);
                    const aiResult = await parseWithGemini(html, fullUrl, normalizedBank, normalizedCard);

                    // Brand fix (only if missing)
                    if (!campaignData.brand) {
                        campaignData.brand = aiResult.brand;
                    }

                    // Sector fix (only if fallback "diger")
                    if (campaignData.sector_slug === 'diger' && aiResult.category && aiResult.category !== 'Diğer') {
                        campaignData.category = aiResult.category;
                        campaignData.sector_slug = generateSectorSlug(aiResult.category);
                    }

                    // Date fix (only if missing)
                    if (!campaignData.valid_until && aiResult.validUntil) {
                        campaignData.valid_until = aiResult.validUntil;
                    }

                    console.log(`      ✅ AI Enhanced: brand="${campaignData.brand}", category="${campaignData.category}", sector="${campaignData.sector_slug}"`);
                } else {
                    console.log(`      ✅ Direct: brand="${campaignData.brand}", category="${campaignData.category}", until="${campaignData.valid_until}"`);
                }
            } // End of AI enhancement block (non-bank campaigns only)

            // Sync complete hierarchy (bank_id, card_id, brand_id, sector_id)
            const { bank_id, card_id, brand_id, sector_id } = await syncHierarchy(
                normalizedBank,
                normalizedCard,
                campaignData.brand,
                campaignData.sector_slug
            );
            campaignData.bank_id = bank_id;
            campaignData.card_id = card_id;
            campaignData.brand_id = brand_id;
            campaignData.sector_id = sector_id;

            // Generate unique slug (/card-brand-sector format)
            const slug = await generateUniqueSlug(normalizedCard, campaignData.brand, campaignData.sector_slug);
            campaignData.slug = slug;

            // Sync earning and discount
            syncEarningAndDiscount(campaignData);

            // Check for activity if end_date exists
            if (campaignData.valid_until) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endDate = new Date(campaignData.valid_until);
                if (endDate < today) {
                    console.log(`      ⚠️  Expired (${campaignData.valid_until}), skipping...`);
                    continue;
                }
            }

            const { error } = await supabase
                .from('campaigns')
                .upsert(campaignData, { onConflict: 'reference_url' });

            if (error) {
                console.error(`      ❌ Error: ${error.message}`);
            } else {
                console.log(`      ✅ Saved: ${campaignData.title}`);
                console.log(`         Hierarchy: bank_id=${bank_id}, card_id=${card_id}, brand_id=${brand_id}, sector_id=${sector_id}`);
                console.log(`         Slug: /${slug}`);
            }

        } catch (error: any) {
            console.error(`      ❌ Error: ${error.message}`);
        }

        await sleep(1500);
    }

    console.log(`\n✅ ${CARD_CONFIG.name} scraper completed!`);
}

runAxessScraper();
