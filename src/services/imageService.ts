import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateCampaignSlug } from '../utils/slugify';
import { Page } from 'puppeteer';

dotenv.config();

// Standardized Supabase Client for Storage
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'campaign-images';

/**
 * Downloads an image using the Puppeteer page context (to bypass WAF) and uploads to Supabase.
 */
export async function processCampaignImage(imageUrl: string, title: string, page: Page, bankName: string = 'chippin'): Promise<string> {
    if (!imageUrl) return '';

    // 1. Generate clean filename
    const slug = generateCampaignSlug(title).substring(0, 50);
    const timestamp = Date.now();
    const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `${bankName}/${slug}-${timestamp}.${extension}`;

    try {
        console.log(`   🖼️  Proxying image: ${imageUrl}`);

        // STRATEGY: High-Quality Element Screenshot
        // Direct download is blocked by WAF, so we screenshot the rendered element
        // but with maximum quality settings (PNG format).

        const filenamePart = imageUrl.split('/').pop()?.split('?')[0];
        if (!filenamePart) throw new Error('Could not extract filename from URL');

        console.log(`   📸 Finding image element: ${filenamePart}`);
        let element = await page.$(`img[src*="${filenamePart}"]`);

        if (!element) {
            console.log('      ⚠️ Image not found, scrolling...');
            await page.evaluate(async () => {
                const distance = 100;
                const delay = 100;
                while (document.scrollingElement && document.scrollingElement.scrollTop + window.innerHeight < document.scrollingElement.scrollHeight) {
                    document.scrollingElement.scrollBy(0, distance);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            });
            element = await page.$(`img[src*="${filenamePart}"]`);
        }

        if (!element) {
            throw new Error(`Image element '${filenamePart}' not found`);
        }

        // High-quality screenshot: PNG format for lossless quality
        const buffer = await element.screenshot({
            type: 'png',
            omitBackground: false
        });
        const contentType = 'image/png';

        // 3. Upload to Supabase Storage
        const { error } = await supabase
            .storage
            .from(BUCKET_NAME)
            .upload(filename, buffer, {
                contentType: contentType,
                upsert: true
            });

        if (error) throw error;

        // 5. Get Public URL
        const { data: publicURL } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(filename);

        console.log(`   ✅ Image uploaded: ${publicURL.publicUrl}`);
        return publicURL.publicUrl;

    } catch (error: any) {
        console.error(`   ⚠️  Image proxy failed: ${error.message}`);
        console.log(`   ↩️  Falling back to original URL.`);
        return imageUrl;
    }
}
