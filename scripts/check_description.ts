import puppeteer from 'puppeteer-extra';

async function checkDescription() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.goto('https://www.chippin.com/kampanyalar', { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 6000));

        const rawData = await page.evaluate(() => {
            const script = document.getElementById('__NEXT_DATA__');
            return script ? script.innerHTML : null;
        });

        const nextData = JSON.parse(rawData!);
        const campaign = nextData?.props?.pageProps?.campaigns[0];

        console.log('webDescription:');
        console.log(campaign.webDescription);

    } finally {
        await browser.close();
    }
}

checkDescription();
