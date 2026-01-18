
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as cheerio from 'cheerio';
import { normalizeBankName, normalizeCardName } from '../../utils/bankMapper';
import { lookupIDs } from '../../utils/idMapper';
import { generateSectorSlug, generateCampaignSlug } from '../../utils/slugify';
import { optimizeCampaigns } from '../../utils/campaignOptimizer';
import { parseWithGemini } from '../../services/geminiParser';
import { assignBadge } from '../../services/badgeAssigner';
import { markGenericBrand } from '../../utils/genericDetector';
import { syncEarningAndDiscount } from '../../utils/dataFixer';

dotenv.config();

// Use Stealth Plugin
puppeteer.use(StealthPlugin());

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.qnbcard.com.tr';
const CAMPAIGNS_URL = 'https://www.qnbcard.com.tr/kampanyalar';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to clean text
function cleanText(text: string | undefined): string {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
}

async function runQNBCardScraper() {
    console.log('🚀 Starting QNB Finansbank (QNBCard) Scraper...');

    // CONFIG
    const BANK_NAME = 'QNB Finansbank';
    const CARD_NAME = 'QNBCard';

    // Parse limit argument
    const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000;

    // Connect to existing Chrome instance running in debug mode (Local only)
    let browser;
    const isCI = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';

    if (!isCI) {
        try {
            console.log('   🔌 Connecting to Chrome debug instance on port 9222...');
            browser = await puppeteer.connect({
                browserURL: 'http://localhost:9222',
                defaultViewport: null
            });
            console.log('   ✅ Connected to existing Chrome instance');
        } catch (error) {
            console.log('   ⚠️  Could not connect to debug Chrome, launching new instance...');
        }
    }

    if (!browser) {
        console.log(`   🚀 Launching new browser instance (Headless: ${isCI})...`);
        browser = await puppeteer.launch({
            headless: isCI,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-position=-10000,0',
                '--disable-blink-features=AutomationControlled'
            ]
        });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log(`   🔍 Loading Campaign List: ${CAMPAIGNS_URL}...`);

        await page.goto(CAMPAIGNS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(3000);

        // --- INFINITE SCROLL / LOAD MORE LOGIC ---
        console.log('   🖱️  Handling "Daha Fazla Göster" buttons...');
        let hasMore = true;
        let clickCount = 0;
        const maxClicks = 50; // Safety limit

        while (hasMore && clickCount < maxClicks) {
            try {
                // Check if button exists and is visible
                const showMoreVisible = await page.evaluate(() => {
                    const btn = document.getElementById('showMore');
                    if (!btn) return false;
                    const style = window.getComputedStyle(btn);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                });

                if (showMoreVisible) {
                    await page.click('#showMore');
                    clickCount++;
                    process.stdout.write('.'); // Progress indicator
                    await sleep(2000 + Math.random() * 1000); // Wait for load

                    // Specific QNB behavior: wait for spinner or list expansion?
                    // Usually simple sleep is enough for simple AJAX
                } else {
                    console.log('\n   ✅ "Daha Fazla Göster" button gone or hidden.');
                    hasMore = false;
                }
            } catch (e) {
                console.log(`\n   ⚠️  Error clicking show more: ${(e as Error).message}`);
                hasMore = false;
            }
        }

        // --- EXTRACT LINKS ---
        console.log('\n   🔍 Extracting campaign links...');
        const campaignLinks = await page.evaluate(() => {
            const links: string[] = [];
            // Campaigns are typically in <a> tags starting with /kampanyalar/
            const anchors = document.querySelectorAll('a[href^="/kampanyalar/"]');
            anchors.forEach((a) => {
                const href = a.getAttribute('href');
                if (href && href.length > 15) { // Filter out short/root links
                    links.push(href);
                }
            });
            return [...new Set(links)]; // Dedupe
        });

        const fullLinks = campaignLinks.map(link => link.startsWith('http') ? link : `${BASE_URL}${link}`);
        console.log(`   🎉 Found ${fullLinks.length} unique campaigns.`);

        // --- NORMALIZE STRINGS ---
        console.log(`   🔍 Normalizing bank/card names...`);
        const normalizedBank = await normalizeBankName(BANK_NAME);
        const normalizedCard = await normalizeCardName(normalizedBank, CARD_NAME);
        console.log(`   ✅ Normalized: ${normalizedBank} / ${normalizedCard}`);

        // --- OPTIMIZATION ---
        console.log(`   🔍 Optimizing campaign list via database check...`);
        const { urlsToProcess } = await optimizeCampaigns(fullLinks, normalizedCard);

        const finalLinks = urlsToProcess.slice(0, limit);
        console.log(`   🚀 Processing ${finalLinks.length} new/updated campaigns (skipping ${fullLinks.length - finalLinks.length} existing)...\n`);

        // --- PROCESS CAMPAIGNS ---
        let count = 0;
        for (const url of finalLinks) {
            count++;
            console.log(`   [${count}/${finalLinks.length}] Processing: ${url}`);

            try {
                // Navigate to detail page
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await sleep(1500 + Math.random() * 1000);

                // Use Cheerio for speed parsing of static content
                const content = await page.content();
                const $ = cheerio.load(content);

                // Extract Data
                const titleEl = $('h1').first();
                const title = cleanText(titleEl.text());

                if (!title) {
                    console.log('      ⚠️  Skipping: No title found.');
                    continue;
                }

                // Description
                // QNBCard uses .left-colm or .campaign-detail-content typically
                let description = cleanText($('.left-colm .search-content').text()) ||
                    cleanText($('.campaign-detail-content').text()) ||
                    cleanText($('.detail-content').text());

                // Image
                // Direct URL usage as verified
                let imageUrl = $('.detail-img img').attr('src') ||
                    $('.campaign-detail picture img').attr('src') ||
                    $('img[src*="Campaign"]').first().attr('src');

                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `${BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
                }

                // Parse with Gemini for structured data (dates, sectors, etc.)
                // QNB puts dates in the text usually
                const fullPageText = $('body').text(); // Use full context for better AI parsing

                let campaignData: any = {};
                try {
                    console.log(`      🧠 AI processing...`);
                    campaignData = await parseWithGemini(
                        fullPageText.substring(0, 5000), // Limit text length
                        url,
                        normalizedBank,
                        normalizedCard
                    );
                } catch (err: any) {
                    console.error(`      ⚠️  AI Error: ${err.message}`);
                    campaignData = {
                        title: title,
                        description: description,
                        category: 'Diğer'
                    };
                }

                // AI Overrides & Corrections
                campaignData.title = title; // Trust scraped title
                campaignData.description = description || campaignData.description;
                campaignData.url = url;
                campaignData.reference_url = url;
                campaignData.bank = normalizedBank;
                campaignData.card_name = normalizedCard;
                campaignData.image = imageUrl || campaignData.image; // Prefer scraped image
                campaignData.is_active = true;

                // Sector & IDs
                campaignData.sector_slug = generateSectorSlug(campaignData.category);

                // Lookup IDs
                const ids = await lookupIDs(
                    campaignData.bank,
                    campaignData.card_name,
                    campaignData.brand,
                    campaignData.sector_slug,
                    campaignData.category
                );
                console.log('      🆔 IDs Lookup Result:', JSON.stringify(ids));

                // Force fix if lookup failed but we know the slug
                if (!ids.bank_id) ids.bank_id = 'qnb-finansbank';
                if (!ids.card_id) ids.card_id = 'qnbcard';

                Object.assign(campaignData, ids);

                // Badge & Generic Check
                const badge = assignBadge(campaignData);
                campaignData.badge_text = badge.text;
                campaignData.badge_color = badge.color;
                markGenericBrand(campaignData);
                syncEarningAndDiscount(campaignData);

                // --- SAVE TO DB (ID-BASED SLUG SYSTEM) ---
                console.log(`      💾 Saving: ${title.substring(0, 30)}...`);

                const { data: existing } = await supabase
                    .from('campaigns')
                    .select('id')
                    .eq('reference_url', url)
                    .single();

                if (existing) {
                    const finalSlug = generateCampaignSlug(title, existing.id);
                    const { error } = await supabase
                        .from('campaigns')
                        .update({ ...campaignData, slug: finalSlug })
                        .eq('id', existing.id);

                    if (error) console.error(`      ❌ Update Error: ${error.message}`);
                    else console.log(`      ✅ Updated (${finalSlug})`);
                } else {
                    const { data: inserted, error: insertError } = await supabase
                        .from('campaigns')
                        .insert(campaignData)
                        .select('id')
                        .single();

                    if (insertError) {
                        console.error(`      ❌ Insert Error: ${insertError.message}`);
                    } else if (inserted) {
                        const finalSlug = generateCampaignSlug(title, inserted.id);
                        await supabase
                            .from('campaigns')
                            .update({ slug: finalSlug })
                            .eq('id', inserted.id);
                        console.log(`      ✅ Inserted (${finalSlug})`);
                    }
                }

            } catch (pageErr) {
                console.error(`      ❌ Error processing ${url}: ${(pageErr as Error).message}`);
            }
        }

    } catch (error) {
        console.error(`❌ Critical Error: ${(error as Error).message}`);
    } finally {
        if (browser) await browser.close();
        console.log('\n🏁 QNBCard Scraper Finished.');
    }
}

runQNBCardScraper();
