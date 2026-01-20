import * as dotenv from 'dotenv';
import { generateCampaignSlug } from '../utils/slugify';
import { Page } from 'puppeteer';

dotenv.config();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

/**
 * Downloads an image directly via HTTP and uploads to Cloudflare Images.
 */
export async function downloadImageDirectly(imageUrl: string, title: string, bankName: string = 'chippin'): Promise<string> {
    if (!imageUrl) return '';
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_HASH) {
        console.warn('   ⚠️  Cloudflare credentials missing. Falling back to original URL.');
        return imageUrl;
    }

    const imageId = `campaign-${bankName}-${generateCampaignSlug(title).substring(0, 40)}-${Date.now()}`;

    try {
        console.log(`   🖼️  Downloading image for Cloudflare: ${imageUrl}`);
        const referer = bankName === 'chippin' ? 'https://www.chippin.com/' : 'https://www.maximum.com.tr/';

        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer,
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const formData = new FormData();
        const blob = new Blob([arrayBuffer], { type: response.headers.get('content-type') || 'image/jpeg' });
        formData.append('file', blob, 'image.jpg');
        formData.append('id', imageId);

        const cfResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
                body: formData,
            }
        );

        const cfData = await cfResponse.json();
        if (cfData.success) {
            const url = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${cfData.result.id}/public`;
            console.log(`   ✅ Image uploaded to Cloudflare: ${url}`);
            return url;
        } else {
            throw new Error(cfData.errors?.[0]?.message || 'Cloudflare upload failed');
        }

    } catch (error: any) {
        console.error(`   ⚠️  Cloudflare upload failed: ${error.message}. Fallback to original.`);
        return imageUrl;
    }
}

/**
 * Screenshots an image element and uploads to Cloudflare Images (bypasses WAF).
 */
export async function processCampaignImage(imageUrl: string, title: string, page: Page, bankName: string = 'chippin'): Promise<string> {
    if (!imageUrl || !page) return '';
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_HASH) {
        return imageUrl;
    }

    const imageId = `campaign-${bankName}-${generateCampaignSlug(title).substring(0, 40)}-${Date.now()}`;

    try {
        console.log(`   📸 Proxying image via screenshot to Cloudflare: ${imageUrl}`);
        const filenamePart = imageUrl.split('/').pop()?.split('?')[0];
        if (!filenamePart) throw new Error('Invalid URL');

        let element = await page.$(`img[src*="${filenamePart}"]`);
        if (!element) {
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise(r => setTimeout(r, 1000));
            element = await page.$(`img[src*="${filenamePart}"]`);
        }

        if (!element) throw new Error('Element not found');

        const buffer = await element.screenshot({ type: 'png' });
        const formData = new FormData();
        const blob = new Blob([buffer as any], { type: 'image/png' });
        formData.append('file', blob, 'image.png');
        formData.append('id', imageId);

        const cfResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
                body: formData,
            }
        );

        const cfData = await cfResponse.json();
        if (cfData.success) {
            const url = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${cfData.result.id}/public`;
            console.log(`   ✅ Screenshot uploaded to Cloudflare: ${url}`);
            return url;
        } else {
            throw new Error(cfData.errors?.[0]?.message || 'Cloudflare upload failed');
        }

    } catch (error: any) {
        console.error(`   ⚠️  Screenshot upload failed: ${error.message}. Fallback to original.`);
        return imageUrl;
    }
}
