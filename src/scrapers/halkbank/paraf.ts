
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { optimizeCampaigns } from '../../utils/campaignOptimizer';
import { normalizeBankName } from '../../utils/bankMapper';

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

    const args = process.argv.slice(2);
    const limitArgIndex = args.indexOf('--limit');
    const limit = limitArgIndex !== -1 ? parseInt(args[limitArgIndex + 1]) : 999;
    const isAIEnabled = args.includes('--ai');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Bot detection bypass
    await page.evaluateOnNewDocument(() => {
        // @ts-ignore
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        // @ts-ignore
        window.chrome = { runtime: {} };
    });

    try {
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Load more campaigns if needed
        let hasMore = true;
        let buttonClickCount = 0;
        const maxClicks = 5;

        while (hasMore && buttonClickCount < maxClicks) {
            try {
                const loadMoreBtn = await page.$('.cmp-list--campaigns .cmp-list__load-more button');
                if (loadMoreBtn) {
                    await loadMoreBtn.click();
                    await sleep(2000);
                    buttonClickCount++;
                    console.log(`   👇 Loaded more campaigns (${buttonClickCount}/${maxClicks})`);
                } else {
                    hasMore = false;
                }
            } catch (e) {
                hasMore = false;
            }
        }
        console.log(`\n   ✅ Loaded list after ${buttonClickCount} clicks.`);

        // Extract Links
        const allCampaignLinks = await page.evaluate(() => {
            const links: string[] = [];
            // @ts-ignore
            const elements = document.querySelectorAll('.cmp-list--campaigns .cmp-teaser__title a');
            elements.forEach((a: any) => {
                const href = a.getAttribute('href');
                if (href && href.includes('/kampanyalar/')) {
                    links.push(href);
                }
            });
            // @ts-ignore
            return [...new Set(links)];
        });

        const campaignLinks = allCampaignLinks.slice(0, limit);
        console.log(`   🎉 Found ${allCampaignLinks.length} campaigns. Processing first ${campaignLinks.length}...`);

        // Check for new and incomplete campaigns
        const fullUrls = campaignLinks.map(link =>
            link.startsWith('http') ? link : `${BASE_URL}${link}`
        );

        const { urlsToProcess } = await optimizeCampaigns(fullUrls, 'Paraf');

        // Process New + Incomplete Campaigns
        for (const fullUrl of urlsToProcess) {
            console.log(`\n   🔍 Processing: ${fullUrl}`);

            try {
                await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Wait for title
                try {
                    await page.waitForSelector('.master-banner__content h1', { timeout: 5000 });
                } catch { }

                const html = await page.content();

                // Extract basic info for fallback
                const fallbackData = await page.evaluate((baseUrl) => {
                    // @ts-ignore
                    const titleEl = document.querySelector('.master-banner__content h1') || document.querySelector('h1');
                    // @ts-ignore
                    const title = titleEl ? titleEl.innerText.trim() : 'Başlıksız Kampanya';

                    let image = null;

                    // PRIORITY 1: Campaign teaser image (most specific)
                    // @ts-ignore
                    const teaserImg = document.querySelector('.cmp-teaser__image img');
                    if (teaserImg && teaserImg.getAttribute('src')?.includes('/kampanyalar/')) {
                        image = teaserImg.getAttribute('src');
                    }

                    // PRIORITY 2: Banner image
                    if (!image) {
                        // @ts-ignore
                        const bannerImg = document.querySelector('.master-banner__image img');
                        if (bannerImg) image = bannerImg.getAttribute('src');
                    }

                    if (image && !image.startsWith('http')) {
                        image = baseUrl + image;
                    }

                    // @ts-ignore
                    const descEl = document.querySelector('.cmp-text p');
                    // @ts-ignore
                    const description = descEl ? descEl.innerText.trim() : title;

                    return { title, image, description };
                }, BASE_URL);

                let campaignData;
                const normalizedBank = await normalizeBankName('Halkbank');

                if (isAIEnabled) {
                    campaignData = await parseWithGemini(html, fullUrl, 'Paraf');

                    // Merge fallback image if AI missed it
                    if (!campaignData.image && fallbackData.image) {
                        campaignData.image = fallbackData.image;
                        console.log('      🔧 Used Puppeteer fallback image');
                    }
                } else {
                    campaignData = {
                        title: fallbackData.title,
                        description: fallbackData.description,
                        image: fallbackData.image,
                        category: 'Diğer',
                        sector_slug: 'genel',
                        card_name: 'Paraf',
                        bank: normalizedBank,
                        url: fullUrl,
                        reference_url: fullUrl,
                        is_active: true,
                        terms: [],
                        tags: []
                    };
                }

                if (campaignData) {
                    // Ensure critical fields
                    campaignData.card_name = 'Paraf';
                    campaignData.bank = normalizedBank;
                    campaignData.url = fullUrl;
                    campaignData.reference_url = fullUrl;
                    if (!campaignData.sector_slug) campaignData.sector_slug = 'genel';

                    syncEarningAndDiscount(campaignData);

                    // Check expiration
                    if (campaignData.end_date) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const endDate = new Date(campaignData.end_date);
                        if (endDate < today) {
                            console.log(`      ⚠️  Expired (${campaignData.end_date}), skipping...`);
                            continue;
                        }
                    }

                    // Set default min_spend
                    campaignData.min_spend = campaignData.min_spend || 0;

                    const { error } = await supabase.from('campaigns').upsert(campaignData, { onConflict: 'reference_url' });
                    if (error) {
                        console.error(`      ❌ Error saving: ${error.message}`);
                    } else {
                        console.log(`      ✅ Saved: ${campaignData.title}`);
                    }
                }
            } catch (error: any) {
                console.error(`      ❌ Error scraping detail: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ General error:', error);
    } finally {
        await browser.close();
        console.log('\n✅ Scraper finished.');
        process.exit(0);
    }
}

runParafScraper();
