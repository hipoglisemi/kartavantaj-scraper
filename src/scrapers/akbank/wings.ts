import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { normalizeBankName, normalizeCardName } from '../../utils/bankMapper';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const CARD_CONFIG = {
    name: 'Wings',
    cardName: 'Wings',
    bankName: 'Akbank',
    baseUrl: 'https://www.wingscard.com.tr',
    listApiUrl: 'https://www.wingscard.com.tr/api/campaign/list',
    refererUrl: 'https://www.wingscard.com.tr/kampanyalar'
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runWingsScraper() {
    const normalizedBank = await normalizeBankName(CARD_CONFIG.bankName);
    const normalizedCard = await normalizeCardName(normalizedBank, CARD_CONFIG.cardName);
    console.log(`\n💳 ${CARD_CONFIG.name} (${normalizedBank} - ${normalizedCard})\n`);
    const isAIEnabled = process.argv.includes('--ai');
    const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

    let page = 1, allCampaigns: any[] = [];

    while (allCampaigns.length < limit) {
        try {
            console.log(`   Fetching page ${page}...`);
            const response = await axios.get(CARD_CONFIG.listApiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': CARD_CONFIG.refererUrl
                },
                params: {
                    keyword: '',
                    sector: '',
                    category: '',
                    page: page.toString()
                }
            });

            const data = response.data;
            if (!data || !data.status || !data.data || !data.data.list || data.data.list.length === 0) {
                console.log('   No more campaigns found.');
                break;
            }

            const campaigns = data.data.list;
            let newCount = 0;
            for (const campaign of campaigns) {
                if (allCampaigns.length >= limit) break;
                // The API likely returns a slug or ID. Wings detail pages use slugs. 
                // Let's assume the API returns 'url' or 'slug'.
                // If it's like Axess, it might be /kampanyalar/kampanya-detay/abc
                const detailPath = campaign.url || `/kampanyalar/kampanya-detay/${campaign.slug}`;
                if (!allCampaigns.some(c => c.href === detailPath)) {
                    allCampaigns.push({ href: detailPath, title: campaign.title });
                    newCount++;
                }
            }
            console.log(`   ✅ Page ${page}: ${campaigns.length} campaigns (${newCount} new). Total: ${allCampaigns.length}`);

            if (allCampaigns.length >= data.data.totalCount || allCampaigns.length >= limit) break;

            page++;
            await sleep(1000);
            if (page > 20) break; // Safety limit
        } catch (error: any) {
            console.error(`   ❌ Error fetching list: ${error.message}`);
            break;
        }
    }

    const campaignsToProcess = allCampaigns.slice(0, limit);
    console.log(`\n🎉 ${campaignsToProcess.length} campaigns. Processing...\n`);

    // AI OPTIMIZATION: Check which campaigns already exist in database
    console.log(`   🔍 Checking for existing campaigns in database...`);
    const fullUrls = campaignsToProcess.map(item =>
        new URL(item.href, CARD_CONFIG.baseUrl).toString()
    );

    const { data: existingCampaigns } = await supabase
        .from('campaigns')
        .select('reference_url, image, description, earning, sector_slug, brand')
        .eq('card_name', normalizedCard)
        .in('reference_url', fullUrls);

    const existingUrls = new Set(
        existingCampaigns?.map(c => c.reference_url) || []
    );

    // Helper function to check if campaign has incomplete data
    function hasIncompleteData(campaign: any): boolean {
        const issues = [];

        // 1. Image missing or is logo
        if (!campaign.image) {
            issues.push('image_missing');
        } else if (campaign.image.includes('logo')) {
            issues.push('image_is_logo');
        }

        // 2. Description missing or too short
        if (!campaign.description || campaign.description.length < 10) {
            issues.push('description_short');
        }

        // 3. Earning missing
        if (!campaign.earning || campaign.earning === '0') {
            issues.push('earning_missing');
        }

        // 4. Sector is default
        if (campaign.sector_slug === 'diger') {
            issues.push('sector_default');
        }

        // 5. Brand missing
        if (!campaign.brand) {
            issues.push('brand_missing');
        }

        if (issues.length > 0) {
            console.log(`      ⚠️  Incomplete (${issues.join(', ')}): ${campaign.reference_url}`);
            return true;
        }

        return false;
    }

    // Find campaigns with incomplete data
    const incompleteCampaigns = existingCampaigns?.filter(c => hasIncompleteData(c)) || [];
    const incompleteUrls = new Set(incompleteCampaigns.map(c => c.reference_url));

    // Filter campaigns to process: new + incomplete
    const campaignsToScrape = campaignsToProcess.filter(item => {
        const fullUrl = new URL(item.href, CARD_CONFIG.baseUrl).toString();
        return !existingUrls.has(fullUrl) || incompleteUrls.has(fullUrl);
    });

    const completeCount = existingUrls.size - incompleteUrls.size;
    console.log(`   📊 Total: ${campaignsToProcess.length}, New: ${campaignsToProcess.length - existingUrls.size}, Incomplete: ${incompleteUrls.size}, Complete: ${completeCount}`);
    console.log(`   ⚡ Skipping ${completeCount} complete campaigns, processing ${campaignsToScrape.length} (${campaignsToProcess.length - existingUrls.size} new + ${incompleteUrls.size} incomplete)...\n`);

    // Launch Puppeteer browser for JavaScript rendering with better evasion
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080',
            '--disable-web-security',
            '--disable-infobars',
            '--ignore-certificate-errors'
        ]
    });
    const browserPage = await browser.newPage();
    await browserPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Bot detection bypass
    await browserPage.evaluateOnNewDocument(() => {
        // @ts-ignore
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        // @ts-ignore
        window.chrome = { runtime: {} };
        // @ts-ignore
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        // @ts-ignore
        Object.defineProperty(navigator, 'languages', { get: () => ['tr-TR', 'tr'] });
    });

    // Request interception
    await browserPage.setRequestInterception(true);
    browserPage.on('request', (req: any) => {
        if (['image', 'script', 'document', 'xhr', 'fetch'].includes(req.resourceType())) {
            req.continue();
        } else {
            req.abort();
        }
    });

    // Process New + Incomplete Campaigns
    for (const item of campaignsToScrape) {
        const fullUrl = new URL(item.href, CARD_CONFIG.baseUrl).toString();
        console.log(`   🔍 ${fullUrl}`);

        let html = '';
        let imageUrl: string | null = null;
        let useFallback = false;

        // Try Puppeteer First
        try {
            await browserPage.goto(fullUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 45000
            });

            // Wait safely for image
            try {
                await sleep(2000); // Basic wait
                await browserPage.waitForSelector('.privileges-detail-image img', { timeout: 4000 });
            } catch (e) {
                // ignore timeout
            }

            html = await browserPage.content();

            // Extract image via Puppeteer
            imageUrl = await browserPage.evaluate(() => {
                // @ts-ignore
                const detailImg = document.querySelector('.privileges-detail-image img');
                // @ts-ignore
                if (detailImg && detailImg.src && detailImg.src.includes('/api/uploads/')) {
                    // @ts-ignore
                    return detailImg.src;
                }
                // @ts-ignore
                const imgs = Array.from(document.querySelectorAll('img'));
                // @ts-ignore
                const campaignImg = imgs.find((img: any) =>
                    img.src &&
                    img.src.includes('/api/uploads/') &&
                    !img.src.includes('logo') &&
                    img.naturalWidth > 400 &&
                    img.naturalHeight > 250
                );
                return (campaignImg as any)?.src || null;
            });

        } catch (puppeteerError: any) {
            console.warn(`      ⚠️  Puppeteer failed (${puppeteerError.message}), using Axios fallback...`);
            useFallback = true;

            // Fallback to Axios
            try {
                const response = await axios.get(fullUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    },
                    timeout: 20000
                });
                html = response.data;
            } catch (axiosError: any) {
                console.error(`      ❌ Axios fallback also failed: ${axiosError.message}`);
                continue; // Skip this item if both fail
            }
        }

        const $ = cheerio.load(html);
        const title = $('h1.banner-title').text().trim() || item.title || 'Başlıksız';

        // ... Process Logic (Cheerio/AI) same as before but using 'html' variable

        let campaignData;
        if (isAIEnabled) {
            campaignData = await parseWithGemini(html, fullUrl, normalizedBank, normalizedCard);
        } else {
            campaignData = {
                title,
                description: title,
                category: 'Diğer',
                sector_slug: 'diger',
                card_name: normalizedCard,
                bank: normalizedBank,
                url: fullUrl,
                reference_url: fullUrl,
                is_active: true
            };
        }

        if (campaignData) {
            // 1.8 Marketing Text Enhancement (NEW)
            if (isAIEnabled) {
                console.log(`      🤖 AI Marketing: Generating catchy summary...`);
                // @ts-ignore
                const { enhanceDescription } = await import('../../services/descriptionEnhancer');
                campaignData.ai_marketing_text = await enhanceDescription(campaignData.title);
            }

            campaignData.title = title;

            // Image assignment logic
            if (!campaignData.image && imageUrl) {
                campaignData.image = imageUrl;
                console.log(`      🔧 Using Puppeteer extracted image`);
            } else if (!campaignData.image && !imageUrl && useFallback) {
                // Try to find image in static HTML if fallback matched
                // Usually client-side rendered but worth a try with Cheerio
                const staticImg = $('.privileges-detail-image img').attr('src');
                if (staticImg) {
                    campaignData.image = staticImg.startsWith('http') ? staticImg : `https://www.wingscard.com.tr${staticImg}`;
                    console.log(`      🔧 Using static HTML image`);
                }
            }

            if (!campaignData.image) {
                console.log('      ⚠️  No image found');
            }

            campaignData.card_name = normalizedCard;
            campaignData.bank = normalizedBank;
            campaignData.url = fullUrl;
            campaignData.reference_url = fullUrl;
            campaignData.category = campaignData.category || 'Diğer';
            campaignData.sector_slug = generateSectorSlug(campaignData.category);
            syncEarningAndDiscount(campaignData);
            campaignData.publish_status = 'processing';
            campaignData.publish_updated_at = new Date().toISOString();
            campaignData.is_active = true;

            if (campaignData.end_date) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endDate = new Date(campaignData.end_date);
                if (endDate < today) {
                    console.log(`      ⚠️  Expired (${campaignData.end_date}), skipping...`);
                    continue;
                }
            }

            campaignData.min_spend = campaignData.min_spend || 0;

            const { error } = await supabase.from('campaigns').upsert(campaignData, { onConflict: 'reference_url' });
            if (error) console.error(`      ❌ ${error.message}`);
            else {
                console.log(`      ✅ Saved: ${title}`);
            }
        }

        await sleep(2000);
    }
    await browser.close();
    console.log(`\n✅ Done!`);
}

runWingsScraper();
