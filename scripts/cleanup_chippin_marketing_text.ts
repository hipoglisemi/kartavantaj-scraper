import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

/**
 * Truncate ai_marketing_text to max 10 words for all Chippin campaigns
 */
async function cleanupMarketingText() {
    console.log('🧹 Starting Chippin ai_marketing_text cleanup...\n');

    // 1. Fetch all Chippin campaigns
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, ai_marketing_text, earning')
        .eq('bank', 'Chippin');

    if (error) {
        console.error('❌ Error fetching campaigns:', error);
        return;
    }

    console.log(`Found ${campaigns?.length || 0} Chippin campaigns.\n`);

    let updatedCount = 0;

    for (const campaign of campaigns || []) {
        if (!campaign.ai_marketing_text) {
            console.log(`⏭️  Skipping "${campaign.title}" (no ai_marketing_text)`);
            continue;
        }

        const words = campaign.ai_marketing_text.trim().split(/\s+/);

        if (words.length <= 10) {
            console.log(`✅ "${campaign.title}" already short (${words.length} words)`);
            continue;
        }

        // Truncate to 10 words
        let truncated = words.slice(0, 10).join(' ');

        // If still too long or empty, fallback to earning
        if (!truncated && campaign.earning) {
            truncated = campaign.earning.split(/\s+/).slice(0, 10).join(' ');
        }

        console.log(`🔧 Updating "${campaign.title}"`);
        console.log(`   Before (${words.length} words): ${campaign.ai_marketing_text.substring(0, 80)}...`);
        console.log(`   After (10 words): ${truncated}`);

        // Update database
        const { error: updateError } = await supabase
            .from('campaigns')
            .update({ ai_marketing_text: truncated })
            .eq('id', campaign.id);

        if (updateError) {
            console.error(`   ❌ Update failed:`, updateError.message);
        } else {
            console.log(`   ✅ Updated successfully\n`);
            updatedCount++;
        }
    }

    console.log(`\n🎉 Cleanup complete! Updated ${updatedCount} campaigns.`);
}

cleanupMarketingText();
