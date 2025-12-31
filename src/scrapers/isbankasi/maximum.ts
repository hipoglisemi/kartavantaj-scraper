/// <reference lib="dom" />

import puppeteer from 'puppeteer';
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

const BASE_URL = 'https://www.maximum.com.tr';
const CAMPAIGNS_URL = 'https://www.maximum.com.tr/kampanyalar';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runMaximumScraperV2() {
    console.log('🚀 Starting İş Bankası (Maximum) Scraper V2...');
    const isAIEnabled = process.argv.includes('--ai');

    // Parse limit argument
    const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 9999;

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security'
        ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        // 1. Gather Categories
        console.log(`\n   🔍 Fetching Categories from ${CAMPAIGNS_URL}...`);
        await page.goto(CAMPAIGNS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(3000);

        const categoryLinks = await page.evaluate(() => {
            const links: string[] = [];
            // Strategy 1: Find links ending with -kampanyalari
            document.querySelectorAll('a').forEach((a: any) => {
                const href = a.getAttribute('href');
                if (href && href.includes('/kampanyalar/') && href.endsWith('-kampanyalari')) {
                    links.push(href);
                }
            });
            // Strategy 2: Check standard known categories if dynamic ones fail
            return [...new Set(links)];
        });

        const fullCategoryUrls = categoryLinks.map(l => l.startsWith('http') ? l : `${BASE_URL}${l}`);
        console.log(`   📂 Found ${fullCategoryUrls.length} categories: ${fullCategoryUrls.map(u => u.split('/').pop()).join(', ')}`);

        // 2. Crawl Each Category
        let allCampaignLinks: { url: string, image: string }[] = [];

        for (const catUrl of fullCategoryUrls) {
            try {
                console.log(`      ➡️  Crawling Category: ${catUrl}`);
                await page.goto(catUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await sleep(3000);

                // Click "Daha Fazla" loop
                let hasMore = true;
                let clickCount = 0;
                while (hasMore && clickCount < 3) { // Limit depth for now
                    try {
                        const btnFound = await page.evaluate(() => {
                            const btns = Array.from(document.querySelectorAll('button'));
                            const loadMore = btns.find(b => b.innerText.includes('Daha Fazla'));
                            if (loadMore) { loadMore.click(); return true; }
                            return false;
                        });
                        if (btnFound) {
                            process.stdout.write('.');
                            await sleep(2000);
                            clickCount++;
                        } else {
                            hasMore = false;
                        }
                    } catch { hasMore = false; }
                }
                process.stdout.write('\n');

                const links = await page.evaluate(() => {
                    const found: { url: string, image: string, title: string }[] = [];
                    // Select specifically campaign cards
                    document.querySelectorAll('.card').forEach((card: any) => {
                        const a = card.querySelector('a');
                        const img = card.querySelector('img');
                        // Try multiple title selectors
                        const titleEl = card.querySelector('.card-text, h3, .card-title, h5, h4, .title') || card.querySelector('div[class*="title" i]');
                        let rawTitle = titleEl ? titleEl.innerText.trim() : '';

                        // Fallback: If title is empty or suspiciously short ("Son Gün"), use full text split
                        if (!rawTitle || rawTitle.toLowerCase().includes('son gün') || rawTitle.length < 5) {
                            rawTitle = card.innerText.trim().split('\n')[0].trim();
                        }

                        if (a && img) {
                            const href = a.getAttribute('href');
                            const src = img.getAttribute('src');

                            if (href && href.includes('/kampanyalar/') &&
                                !href.endsWith('-kampanyalari') &&
                                !href.includes('arsiv') &&
                                href.length > 25) {

                                found.push({
                                    url: href,
                                    image: src || '',
                                    title: rawTitle
                                });
                            }
                        }
                    });
                    // Fallback for non-card layout (if any)
                    if (found.length === 0) {
                        document.querySelectorAll('a').forEach((a: any) => {
                            const href = a.getAttribute('href');
                            if (href && href.includes('/kampanyalar/') && !href.endsWith('-kampanyalari') && href.length > 50) {
                                found.push({ url: href, image: '', title: a.innerText.trim() });
                            }
                        });
                    }
                    return found;
                });

                allCampaignLinks.push(...links);

            } catch (e) {
                console.error(`      ❌ Error crawling category ${catUrl}:`, e);
            }
        }

        // Deduplicate by URL
        const uniqueMap = new Map();
        allCampaignLinks.forEach(item => {
            if (!uniqueMap.has(item.url)) uniqueMap.set(item.url, item);
        });

        const uniqueItems = Array.from(uniqueMap.values());

        // Normalize URLs
        const fullItems = uniqueItems.map(item => ({
            ...item,
            url: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
            image: (item.image && !item.image.startsWith('http')) ? `${BASE_URL}${item.image.startsWith('/') ? '' : '/'}${item.image}` : item.image
        }));

        console.log(`\n   🎉 Total Unique Campaigns Found: ${fullItems.length}`);

        // 3. Optimize & Limit
        const normalizedBank = await normalizeBankName('İş Bankası');
        const normalizedCard = await normalizeCardName(normalizedBank, 'Maximum');

        const { urlsToProcess } = await optimizeCampaigns(fullItems.map(i => i.url), normalizedCard);

        // Filter final list based on optimized URLs
        const finalItems = fullItems.filter(i => urlsToProcess.includes(i.url)).slice(0, limit);

        console.log(`   🚀 Processing ${finalItems.length} campaigns (Limit: ${limit})...\n`);

        // 4. Process Details
        for (const item of finalItems) {
            console.log(`   🔍 Processing: ${item.url}`);
            try {
                let content = { title: '', image: '', html: '' };

                try {
                    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                    content = await page.evaluate(() => {
                        const h1 = document.querySelector('h1')?.innerText?.trim() || '';

                        // Extract Clean Text
                        const bodyClone = document.body.cloneNode(true) as HTMLElement;
                        bodyClone.querySelectorAll('script, style, nav, footer, header').forEach((el) => el.remove());
                        const cleanHtml = bodyClone.innerHTML;

                        return { title: h1, image: '', html: cleanHtml };
                    });
                } catch (navErr) {
                    console.log(`      ⚠️  Detail page load failed (Access Blocked?), using list data...`);
                }

                // Fallback to list data if detail extraction failed
                const finalTitle = content.title || item.title || 'Kampanya Detayı'; // AI will fix this from URL
                const finalImage = item.image; // USE LIST IMAGE (Trustworthy)

                // Default Data
                let campaignData: any = {
                    title: finalTitle,
                    description: finalTitle,
                    card_name: normalizedCard,
                    bank: normalizedBank,
                    url: item.url,
                    reference_url: item.url,
                    image: finalImage,
                    category: 'Diğer',
                    sector_slug: 'diger',
                    is_active: true
                };

                // AI Parsing
                if (isAIEnabled) {
                    const metadata = {
                        title: content.title,
                        bank: normalizedBank,
                        card: normalizedCard,
                        image: finalImage
                    };
                    const aiData = await parseWithGemini(content.html, item.url, normalizedBank, normalizedCard, metadata);
                    if (aiData) {
                        campaignData = { ...campaignData, ...aiData };
                    }
                }

                // Final Polish
                campaignData.image = finalImage; // Ensure fixed image is used
                syncEarningAndDiscount(campaignData);
                const ids = await lookupIDs(campaignData.bank, campaignData.card_name, campaignData.brand, campaignData.sector_slug);
                Object.assign(campaignData, ids);
                assignBadge(campaignData);
                markGenericBrand(campaignData);

                // Save
                const { error } = await supabase.from('campaigns').upsert(campaignData, { onConflict: 'reference_url' });

                if (error) console.error(`      ❌ DB Error: ${error.message}`);
                else console.log(`      ✅ Saved: ${campaignData.title}`);

            } catch (err: any) {
                console.error(`      ❌ Error fetching detail: ${err.message}`);
            }
            await sleep(1000);
        }

    } catch (e) {
        console.error('Critical Error:', e);
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    runMaximumScraperV2();
}
