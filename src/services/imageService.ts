import * as dotenv from 'dotenv';
import { generateCampaignSlug } from '../utils/slugify';
import { Page } from 'puppeteer';

dotenv.config();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

/**
 * Downloads an image and uploads to Cloudflare.
 * PREFERRED: If 'page' is provided, it fetches the image INSIDE the browser context
 * to bypass all WAF/Hotlink protections with 100% original quality.
 */
export async function downloadImageDirectly(
    imageUrl: string,
    title: string,
    bankName: string = 'chippin',
    page?: Page
): Promise<string> {
    if (!imageUrl) return '';

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_HASH) {
        console.warn('   ⚠️  Cloudflare credentials missing. Falling back to original URL.');
        return imageUrl;
    }

    const imageId = `campaign-${bankName}-${generateCampaignSlug(title).substring(0, 40)}-${Date.now()}`;

    try {
        let buffer: Buffer;
        let contentType: string = 'image/jpeg';

        if (page) {
            console.log(`   🌐 Fetching image via Browser Context: ${imageUrl}`);
            // 🔥 BU YÖNTEM BANKA ENGELİNİ %100 AŞAR (Tarayıcı içinden fetch)
            const base64Data = await page.evaluate(async (url) => {
                const response = await fetch(url);
                const blob = await response.blob();
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }, imageUrl);

            const base64Content = base64Data.split(',')[1];
            buffer = Buffer.from(base64Content, 'base64');
            contentType = base64Data.split(';')[0].split(':')[1] || 'image/jpeg';
            console.log(`   ✅ Image captured from browser context (${buffer.length} bytes)`);
        } else {
            console.log(`   🖼️  Attempting server-side download: ${imageUrl}`);
            const axios = (await import('axios')).default;
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': bankName === 'chippin' ? 'https://www.chippin.com/' : 'https://www.maximum.com.tr/',
                },
                timeout: 10000
            });
            buffer = Buffer.from(response.data);
            contentType = response.headers['content-type'] || 'image/jpeg';
        }

        return await uploadBufferToCloudflare(buffer, imageId, contentType);

    } catch (error: any) {
        console.error(`   ❌ Failed to capture image: ${error.message}`);
        return imageUrl;
    }
}

/**
 * Upload buffer to Cloudflare Images
 */
async function uploadBufferToCloudflare(buffer: Buffer, imageId: string, contentType: string): Promise<string> {
    const FormData = (await import('form-data')).default;
    const axios = (await import('axios')).default;

    const formData = new FormData();
    formData.append('file', buffer, {
        filename: 'image.jpg',
        contentType: contentType,
    });
    formData.append('id', imageId);

    const cfResponse = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
        formData,
        {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        }
    );

    if (cfResponse.data.success) {
        const url = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${cfResponse.data.result.id}/public`;
        console.log(`   ✅ Cloudflare Upload Success: ${url}`);
        return url;
    } else {
        throw new Error('Cloudflare upload failed');
    }
}

/**
 * Screenshots an image element and uploads to Cloudflare Images (bypasses WAF).
 * FALLBACK method.
 */
export async function processCampaignImage(imageUrl: string, title: string, page: Page, bankName: string = 'chippin'): Promise<string> {
    const imageId = `campaign-${bankName}-${generateCampaignSlug(title).substring(0, 40)}-${Date.now()}`;

    try {
        const filenamePart = imageUrl.split('/').pop()?.split('?')[0];
        if (!filenamePart) throw new Error('Invalid image URL');

        const element = await page.evaluateHandle((part) => {
            const img = Array.from(document.querySelectorAll('img')).find(i => i.src.includes(part));
            if (img) {
                img.scrollIntoView({ behavior: 'instant', block: 'center' });
                return img;
            }
            return null;
        }, filenamePart);

        const imgElement = element.asElement();
        if (!imgElement) throw new Error('Image element not found on page');

        const buffer = await imgElement.screenshot({
            type: 'jpeg',
            quality: 95
        });

        return await uploadBufferToCloudflare(Buffer.from(buffer), imageId, 'image/jpeg');

    } catch (error: any) {
        console.error(`   ⚠️  Screenshot capture failed: ${error.message}`);
        return imageUrl;
    }
}
