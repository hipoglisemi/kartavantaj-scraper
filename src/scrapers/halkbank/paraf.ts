
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { normalizeBankName, normalizeCardName } from '../../utils/bankMapper';
import { optimizeCampaigns } from '../../utils/campaignOptimizer';
import { lookupIDs } from '../../utils/idMapper';
import { assignBadge } from '../../services/badgeAssigner';
import { markGenericBrand } from '../../utils/genericDetector';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.paraf.com.tr';
const CAMPAIGNS_URL = 'https://www.paraf.com.tr/tr/kampanyalar.html';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runParafScraper() {
    console.log('\n💳 Paraf (Halkbank)');
    const normalizedBank = await normalizeBankName('Halkbank');
    const normalizedCard = await normalizeCardName(normalizedBank, 'Paraf');
    console.log(`   Bank: ${normalizedBank}, Card: ${normalizedCard}`);

    const args = process.argv.slice(2);
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 999;
    const isAIEnabled = args.includes('--ai');

    try {
        // 1. Fetch Campaign List
        console.log(`   📄 Fetching campaigns from ${CAMPAIGNS_URL}...`);
        const response = await axios.get(CAMPAIGNS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        const campaignLinks: string[] = [];

        // Extract campaign links
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('/kampanyalar/') && !href.endsWith('.html') && href.split('/').length > 4) {
                // Valid campaign URLs: /tr/kampanyalar/kategori/kampanya-adi.html
                if (!['#', 'javascript'].some(x => href.includes(x))) {
                    let fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

                    // Normalize URL
                    try {
                        fullUrl = new URL(fullUrl).href;
                        if (!campaignLinks.includes(fullUrl) && fullUrl.endsWith('.html')) {
                            campaignLinks.push(fullUrl);
                        }
                    } catch (e) {
                        // Invalid URL, skip
                    }
                }
            }
        });

        console.log(`\n   🎉 Found ${campaignLinks.length} campaigns.`);

        // Apply limit
        const limitedLinks = limit ? campaignLinks.slice(0, limit) : campaignLinks;
        console.log(`   Processing first ${limitedLinks.length}...`);

        // 2. Optimize
        const { urlsToProcess } = await optimizeCampaigns(limitedLinks, normalizedCard);

        // 3. Process Details
        for (const fullUrl of urlsToProcess) {
            console.log(`\n   🔍 Processing: ${fullUrl}`);

            try {
                await sleep(500); // Rate limiting

                const detailResponse = await axios.get(fullUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    timeout: 20000
                });

                const detail$ = cheerio.load(detailResponse.data);

                // Extract basic info for fallback
                const title = detail$('.master-banner__content h1').first().text().trim() ||
                    detail$('h1').first().text().trim() ||
                    'Başlıksız Kampanya';

                // Extract image
                let image: string | null = null;
                const teaserImg = detail$('.cmp-teaser__image img').first();
                if (teaserImg.length && teaserImg.attr('src')?.includes('/kampanyalar/')) {
                    image = teaserImg.attr('src');
                    if (image && !image.startsWith('http')) {
                        image = `${BASE_URL}${image}`;
                    }
                }

                // Get full HTML for AI
                const html = detailResponse.data;

                let campaignData: any;

                if (isAIEnabled) {
                    campaignData = await parseWithGemini(html, fullUrl, normalizedBank, normalizedCard);

                    // Fallback image if AI missed it
                    if (!campaignData.image && image) {
                        campaignData.image = image;
                        console.log('      🔧 Used fallback image');
                    }

                    // Paraf-specific: Default participation method if missing
                    if (!campaignData.participation_method) {
                        // Check if HTML mentions specific participation
                        if (html.includes('Paraf Mobil') || html.includes('Halkbank Mobil') || html.includes('HEMEN KATIL')) {
                            campaignData.participation_method = "Paraf Mobil veya Halkbank Mobil uygulamasından 'Hemen Katıl' butonuna tıklayın";
                        }
                    }
                } else {
                    // No AI mode - basic data
                    campaignData = {
                        title,
                        description: title,
                        image,
                        category: 'Diğer',
                        sector_slug: 'genel',
                        card_name: normalizedCard,
                        bank: normalizedBank,
                        url: fullUrl,
                        reference_url: fullUrl,
                        is_active: true
                    };
                }

                if (campaignData) {
                    // Ensure critical fields
                    campaignData.card_name = normalizedCard;
                    campaignData.bank = normalizedBank;
                    campaignData.url = fullUrl;
                    campaignData.reference_url = fullUrl;
                    if (!campaignData.sector_slug) campaignData.sector_slug = 'genel';

                    syncEarningAndDiscount(campaignData);
                    campaignData.publish_status = 'processing';
                    campaignData.publish_updated_at = new Date().toISOString();

                    // Set default min_spend
                    if (campaignData.min_spend === undefined || campaignData.min_spend === null) {
                        campaignData.min_spend = 0;
                    }

                    // Lookup IDs
                    const idsResult = await lookupIDs(campaignData);
                    Object.assign(campaignData, idsResult);

                    // Assign badge
                    const badgeResult = await assignBadge(campaignData);
                    campaignData.badge = badgeResult.badge;

                    // Mark generic brand
                    const brandResult = await markGenericBrand(campaignData);
                    campaignData.brand = brandResult.brand;
                    campaignData.is_generic = brandResult.is_generic;

                    // Upsert to database
                    const { error } = await supabase.from('campaigns').upsert(campaignData, { onConflict: 'reference_url' });

                    if (error) {
                        console.error(`      ❌ Error saving: ${error.message}`);
                    } else {
                        console.log(`      ✅ Saved: ${campaignData.title}`);
                    }
                }

            } catch (error: any) {
                console.error(`      ❌ Error processing campaign: ${error.message}`);
                continue;
            }
        }

        console.log('\n✅ Scraper finished.');

    } catch (error: any) {
        console.error(`❌ Fatal error: ${error.message}`);
        process.exit(1);
    }
}

runParafScraper();
