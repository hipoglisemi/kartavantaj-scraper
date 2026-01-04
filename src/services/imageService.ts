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

        // 2. Navigate to Image URL directly (Most reliable WAF bypass)
        const response = await page.goto(imageUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        if (!response || !response.ok()) {
            throw new Error(`Failed to load image page: ${response?.status()} ${response?.statusText()}`);
        }

        // 3. Get buffer
        const buffer = await response.buffer();

        // 4. Validate Content Type
        // Sometimes headers are "text/html" even for images if blocked, but checking buffer headers is safer
        const contentType = response.headers()['content-type'] || 'image/jpeg';

        if (contentType.includes('text') || contentType.includes('html')) {
            // Double check magic bytes if header says html (sometimes misconfigured)
            // But usually it means error page.
            const head = buffer.toString('utf8', 0, 50);
            if (head.includes('<!DOCTYPE') || head.includes('<html')) {
                throw new Error(`Downloaded content is HTML (${contentType}). WAF Blocked.`);
            }
        }

        // 5. Upload to Supabase Storage
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
