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

        // 2. Fetch using Page context (Headless Browser)
        // This ensures cookies/headers are identical to the successful navigation
        const imageBuffer = await page.evaluate(async (url) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const blob = await response.blob();

            // Convert blob to base64 to pass back to Node
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }, imageUrl);

        // 3. Decode Base64 (Data URL)
        const matches = imageBuffer.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 data returned from page');
        }

        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        // Check if it's HTML (WAF block page detection)
        if (contentType.includes('text') || contentType.includes('html')) {
            throw new Error(`Downloaded content is HTML (${contentType}). WAF Blocked.`);
        }

        // 4. Upload to Supabase Storage
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
