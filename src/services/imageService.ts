
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateCampaignSlug } from '../utils/slugify';

dotenv.config();

// Standardized Supabase Client for Storage
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'campaign-images';

/**
 * Downloads an image from a source URL and uploads it to Supabase Storage.
 * Returns the new public Supabase URL.
 * Fallback: Returns the original URL if upload fails.
 */
export async function processCampaignImage(imageUrl: string, title: string, bankName: string = 'chippin'): Promise<string> {
    if (!imageUrl) return '';

    // 1. Generate a clean filename
    const slug = generateCampaignSlug(title).substring(0, 50); // Limit length
    const timestamp = Date.now();
    const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `${bankName}/${slug}-${timestamp}.${extension}`;

    try {
        console.log(`   🖼️  Proxying image: ${imageUrl}`);

        // 2. Fetch the image (Mimic Browser to pass WAF)
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.chippin.com/',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Upload to Supabase Storage
        const contentTypes: Record<string, string> = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp'
        };

        const { data, error } = await supabase
            .storage
            .from(BUCKET_NAME)
            .upload(filename, buffer, {
                contentType: contentTypes[extension] || 'image/jpeg',
                upsert: true
            });

        if (error) {
            throw error;
        }

        // 4. Get Public URL
        const { data: publicURL } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(filename);

        console.log(`   ✅ Image uploaded: ${publicURL.publicUrl}`);
        return publicURL.publicUrl;

    } catch (error: any) {
        console.error(`   ⚠️  Image proxy failed: ${error.message}`);
        console.log(`   ↩️  Falling back to original URL.`);
        return imageUrl; // Fallback to original
    }
}
