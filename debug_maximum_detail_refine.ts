import puppeteer from 'puppeteer';

async function debugDetailRefine() {
    const url = 'https://www.maximum.com.tr/kampanyalar/yolcu360-tan-yurtici-ucak-biletlerinde-indirim-firsati';
    console.log(`Navigating to: ${url}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        // Retry logic
        let success = false;
        for (let i = 0; i < 3; i++) {
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                success = true;
                break;
            } catch (e) {
                console.log(`Retry ${i + 1}...`);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        if (!success) throw new Error("Failed to load page after 3 attempts");

        await new Promise(r => setTimeout(r, 4000)); // Wait for lazy load

        const analysis = await page.evaluate(() => {
            const getBg = (el: Element) => {
                const style = window.getComputedStyle(el);
                return style.backgroundImage;
            };

            // Meta image is usually the best bet
            const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
            const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

            const subpageDetail = document.querySelector('.subpage-detail');
            const mainContent = document.querySelector('.main-content');

            // Collect all elements with background images
            const bgImages: any[] = [];
            document.querySelectorAll('*').forEach(el => {
                const bg = getBg(el);
                if (bg && bg !== 'none' && !bg.includes('gradient')) {
                    bgImages.push({
                        tag: el.tagName,
                        class: el.className,
                        bg: bg
                    });
                }
            });

            return {
                subpageDetailHtml: subpageDetail ? subpageDetail.innerHTML.substring(0, 1000) : 'NOT FOUND',
                bgImages: bgImages.slice(0, 10),
                // Try to find ANY image with 'PublishingImages'
                publishingImages: Array.from(document.querySelectorAll('img')).filter(i => i.src.includes('PublishingImages')).map(i => i.src)
            };
        });

        console.log('--- DEEPER ANALYSIS ---');
        console.log(JSON.stringify(analysis, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

debugDetailRefine();
