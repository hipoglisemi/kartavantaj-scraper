
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../../services/geminiParser';
import { generateSectorSlug } from '../../utils/slugify';
import { syncEarningAndDiscount } from '../../utils/dataFixer';
import { optimizeCampaigns } from '../../utils/campaignOptimizer';
import { lookupIDs } from '../../utils/idMapper';
import { assignBadge } from '../../services/badgeAssigner';
import { markGenericBrand } from '../../utils/genericDetector';
import { normalizeBankName, normalizeCardName } from '../../utils/bankMapper';

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

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Bot detection bypass
    await page.evaluateOnNewDocument(() => {
        // @ts-ignore
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        // @ts-ignore
        window.chrome = { runtime: {} };
    });

    // Retry Navigation Helper
    async function retryNavigation(page: any, url: string, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
                return;
            } catch (e: any) {
                console.log(`      ⚠️  Navigation error (Attempt ${i + 1}/${retries}): ${e.message}`);
                if (i === retries - 1) throw e;
                const waitTime = 5000 * Math.pow(2, i); // Exponential backoff: 5s, 10s, 20s
                await sleep(waitTime);
            }
        }
    }

    try {
        await retryNavigation(page, CAMPAIGNS_URL);

        // Wait for campaigns to load dynamically
        try {
            await page.waitForSelector('.cmp-list--campaigns', { visible: true, timeout: 20000 });
            await sleep(2000);
        } catch (e) {
            console.log('   ⚠️  Campaign list did not load within timeout.');
        }

        // Load more campaigns logic
        let hasMore = true;
        let buttonClickCount = 0;
        const maxClicks = 20;

        while (hasMore && buttonClickCount < maxClicks) {
            // Optimization: Check if we have enough items
            const currentCount = await page.evaluate(() => document.querySelectorAll('.cmp-list--campaigns .cmp-teaser__title a').length);
            if (currentCount >= limit) {
                console.log(`   ✨ Reached limit (${currentCount} >= ${limit}), stopping load more.`);
                break;
            }

            try {
                // Scroll to bottom
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await sleep(1000);

                // Look for "DAHA FAZLA" button
                const buttons = await page.$$('a, button, div[role="button"]');
                let loadMoreBtn = null;

                for (const btn of buttons) {
                    const text = await page.evaluate(el => el.textContent, btn);
                    if (text && text.trim().toUpperCase() === 'DAHA FAZLA') {
                        const isVisible = await page.evaluate((el: any) => {
                            const style = window.getComputedStyle(el);
                            return style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
                        }, btn);
                        if (isVisible) {
                            loadMoreBtn = btn;
                            break;
                        }
                    }
                }

                if (loadMoreBtn) {
                    process.stdout.write('.');
                    await page.evaluate((el) => el.click(), loadMoreBtn);
                    await sleep(3000);
                    buttonClickCount++;
                } else {
                    hasMore = false;
                }
            } catch (e) {
                console.error('   ⚠️  Error in load more loop:', e);
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
            return [...new Set(links)];
        });

        const campaignLinks = allCampaignLinks.slice(0, limit);
        console.log(`   🎉 Found ${allCampaignLinks.length} campaigns. Processing first ${campaignLinks.length}...`);

        // Check for new and incomplete campaigns
        const fullUrls = campaignLinks.map(link =>
            link.startsWith('http') ? link : `${BASE_URL}${link}`
        );

        const { urlsToProcess } = await optimizeCampaigns(fullUrls, normalizedCard);

        // Process New + Incomplete Campaigns
        for (const fullUrl of urlsToProcess) {
            console.log(`\n   🔍 Processing: ${fullUrl}`);

            try {
                await retryNavigation(page, fullUrl);

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

                if (isAIEnabled) {
                    campaignData = await parseWithGemini(html, fullUrl, normalizedBank, normalizedCard);

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
                    // Lookup and assign IDs from master tables
                    const ids = await lookupIDs(
                        campaignData.bank,
                        campaignData.card_name,
                        campaignData.brand,
                        campaignData.sector_slug
                    );
                    Object.assign(campaignData, ids);
                    // Assign badge based on campaign content
                    const badge = assignBadge(campaignData);
                    campaignData.badge_text = badge.text;
                    campaignData.badge_color = badge.color;
                    // Mark as generic if it's a non-brand-specific campaign
                    markGenericBrand(campaignData);

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
