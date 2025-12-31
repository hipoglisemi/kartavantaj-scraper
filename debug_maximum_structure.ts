import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function debugMaximum() {
    const listUrl = 'https://www.maximum.com.tr/kampanyalar';
    console.log(`Navigating to ${listUrl}...`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        // 1. Analyze List Page
        await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 5000)); // Wait for chunks

        const listAnalysis = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const loadMoreBtn = buttons.find(b => b.innerText.includes('Daha Fazla'));

            const cards = Array.from(document.querySelectorAll('.card')).slice(0, 3).map(c => ({
                html: c.innerHTML.substring(0, 200),
                innerText: (c as HTMLElement).innerText,
                titleSelector: c.querySelector('h5, h4, .title, .card-title')?.textContent
            }));

            return {
                title: document.title,
                hasLoadMore: !!loadMoreBtn,
                sampleCards: cards,
                campaignCount: document.querySelectorAll('a[href*="/kampanyalar/"]').length
            };
        });

        console.log('--- LIST PAGE ANALYSIS ---');
        console.log(JSON.stringify(listAnalysis, null, 2));

        // 2. Analyze Detail Page (Take first sample)
        if (listAnalysis.sampleLinks.length > 0) {
            const detailUrl = listAnalysis.sampleLinks[0];
            console.log(`\nNavigating to detail: ${detailUrl}...`);
            await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 3000));

            const detailAnalysis = await page.evaluate(() => {
                const h1 = document.querySelector('h1')?.innerText;
                const img = document.querySelector('img')?.src;
                // Dump mostly text content
                const contentText = document.body.innerText.substring(0, 500);
                return { h1, img, contentPreview: contentText };
            });

            console.log('--- DETAIL PAGE ANALYSIS ---');
            console.log(JSON.stringify(detailAnalysis, null, 2));

            // Save HTML for grep
            const html = await page.content();
            fs.writeFileSync('maximum_detail_dump.html', html);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

debugMaximum();
