
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { enhanceDescription } from '../../services/descriptionEnhancer';
import { isBankCampaign, getBankCampaignReason } from '../../utils/bankCampaignDetector';
import { extractSnippetForAI, classifySectorWithAI } from '../../utils/aiSnippetClassifier';
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

    // Fetch Master Brands for direct extraction (with sector mapping)
    console.log('   📚 Fetching master brands with sector mappings...');
    const { data: brandsData } = await supabase.from('master_brands').select('name, sector_id');
    const masterBrands = brandsData || [];
    console.log(`   ✅ Loaded ${masterBrands.length} brands (${masterBrands.filter(b => b.sector_id).length} with sector mapping).`);

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
                    is_bank_campaign: true,
                    classification_method: 'bank_campaign',
                    sector_confidence: 'high',
                    needs_manual_sector: false,
                    publish_status: 'processing',
                    publish_updated_at: new Date().toISOString(),
                    is_active: true
                };
            } else {
                // 1. Direct Extraction (Min AI)
                console.log(`      ⚡ Direct: Extracting deterministic fields...`);
                const directData = await extractDirectly(html, title, masterBrands);

                // Core field extraction
                const rawDescription = directData.description || title;

                campaignData = {
                    title: title,
                    description: rawDescription, // Using raw description to save tokens
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
                    min_spend_currency: directData.min_spend_currency,
                    earning: directData.earning,
                    earning_currency: directData.earning_currency,
                    discount: directData.discount,
                    max_discount: directData.max_discount,
                    max_discount_currency: directData.max_discount_currency,
                    discount_percentage: directData.discount_percentage,
                    math_flags: directData.math_flags,
                    required_spend_for_max_benefit: directData.required_spend_for_max_benefit,
                    required_spend_currency: directData.required_spend_currency,
                    has_mixed_currency: directData.has_mixed_currency || false,
                    ai_suggested_valid_until: directData.ai_suggested_valid_until,
                    ai_suggested_math: directData.ai_suggested_math,
                    is_bank_campaign: directData.is_bank_campaign || false,
                    sector_confidence: directData.sector_confidence,
                    classification_method: directData.classification_method,
                    needs_manual_sector: directData.needs_manual_sector || false,
                    math_method: directData.math_method,
                    needs_manual_math: directData.needs_manual_math || false,
                    participation_method: directData.participation_method,
                    eligible_cards: directData.eligible_cards,
                    spend_channel: directData.spend_channel,
                    perk_text: directData.perk_text,
                    coupon_code: directData.coupon_code,
                    reward_type: directData.reward_type,
                    needs_manual_reward: directData.needs_manual_reward || false,
                    ai_marketing_text: '', // To be filled below
                    publish_status: 'processing',
                    publish_updated_at: new Date().toISOString(),
                    is_active: true
                };
            } // End of else block (non-bank campaigns)

            // 1.5 Assign Badge
            const badge = assignBadge(campaignData);
            campaignData.badge_text = badge.text;
            campaignData.badge_color = badge.color;

            // 1.8 Marketing Text Enhancement (NEW)
            if (isAIEnabled && !isBankCamp) {
                console.log(`      🤖 AI Marketing: Generating catchy summary...`);
                campaignData.ai_marketing_text = await enhanceDescription(campaignData.title);
            }

            // 2. Conditional AI Enhancement (only for non-bank campaigns)
            if (!isBankCamp) {
                // Check if AI is needed (only for sector classification now)
                const needsSectorAI = campaignData.sector_slug === 'diger';

                if (isAIEnabled && needsSectorAI) {
                    console.log(`      🤖 AI Snippet: Sector unclear, using minimal AI classification...`);

                    // Extract snippet (300-400 chars) instead of full HTML
                    const snippet = extractSnippetForAI(title, campaignData.description);
                    console.log(`      📝 Snippet length: ${snippet.length} chars (vs ${html.length} full HTML)`);

                    // Minimal AI call (sector-only)
                    const geminiKey = process.env.GOOGLE_GEMINI_KEY || '';
                    const aiSector = await classifySectorWithAI(snippet, geminiKey);

                    if (aiSector.sector_slug !== 'diger') {
                        campaignData.sector_slug = aiSector.sector_slug;
                        campaignData.classification_method = 'ai_snippet';
                        campaignData.sector_confidence = aiSector.confidence >= 0.7 ? 'high' : 'medium';
                        console.log(`      ✅ AI Sector: "${aiSector.sector_slug}" (confidence: ${aiSector.confidence})`);
                    } else {
                        // AI couldn't classify, flag for manual review
                        campaignData.needs_manual_sector = true;
                        campaignData.sector_confidence = 'low';
                        console.log(`      ⚠️ AI uncertain, flagged for manual review`);
                    }
                } else {
                    console.log(`      ✅ Direct: brand="${campaignData.brand}", sector="${campaignData.sector_slug}"`);
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
