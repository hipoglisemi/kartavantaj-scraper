import * as dotenv from 'dotenv';
import { generateCampaignSlug } from '../utils/slugify';
import { Page } from 'puppeteer';
import { supabase } from '../utils/supabase';

dotenv.config();

const BUCKET_NAME = 'campaign-images';

/**
 * Downloads an image and uploads to Supabase Storage (Buffer for Cloudflare migration).
 * This is the "Image Bridge" approach: Bank -> Supabase -> Cloudflare (via cron).
 */
export async function downloadImageDirectly(
    imageUrl: string,
    title: string,
    bankName: string = 'chippin',
    page?: Page
): Promise<string> {
    if (!imageUrl) return '';

    // Consistent filename for "Upsert" logic (avoids duplicates)
    const slug = generateCampaignSlug(title).substring(0, 50);
    const filename = `${bankName}/${slug}.jpg`;

    try {
        let buffer: Buffer;
        let contentType: string = 'image/jpeg';

        // 1. CAPTURE IMAGE DATA
        if (page) {
            console.log(`   🌐 Fetching via Browser Context: ${imageUrl}`);
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

        // 2. UPLOAD TO SUPABASE STORAGE (UPSERT)
        console.log(`   📤 Uploading to Supabase Storage: ${filename}`);
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filename, buffer, {
                contentType: contentType,
                upsert: true
            });

        if (error) {
            throw new Error(`Supabase Upload Error: ${error.message}`);
        }

        // 3. GET PUBLIC URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filename);

        console.log(`   ✅ Supabase Bridge Success: ${publicUrl}`);
        return publicUrl;

    } catch (error: any) {
        console.error(`   ❌ Failed to bridge image: ${error.message}`);
        // Fallback to original bank URL if everything fails
        return imageUrl;
    }
}

/**
 * Cleanup: Deletes processed image from Supabase after successful Cloudflare migration.
 */
export async function deleteFromSupabase(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
    if (error) {
        console.error(`   ⚠️ Failed to delete from Supabase: ${error.message}`);
    } else {
        console.log(`   🗑️ Cleaned up from Supabase: ${path}`);
    }
}
