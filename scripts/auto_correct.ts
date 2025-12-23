import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../src/services/geminiParser';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''; // Using service role key is better for automation
const supabase = createClient(supabaseUrl, supabaseKey);

async function autoCorrect() {
    console.log('🚀 Starting Auto-Correction Cycle...');

    // 1. Fetch campaigns that need attention
    // - ai_parsing_incomplete is true
    // - math errors (min_spend > 0 and earning >= min_spend and min_spend > 10)

    // We fetch all and filter in TS for complex logic
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .or('ai_parsing_incomplete.eq.true,quality_score.lt.70')
        .limit(50); // Process in batches to avoid rate limits

    if (error) {
        console.error('Error fetching campaigns:', error);
        return;
    }

    console.log(`Found ${campaigns?.length || 0} campaigns requiring attention.`);

    for (const campaign of campaigns || []) {
        console.log(`\n🧐 Inspecting campaign [${campaign.id}]: ${campaign.title}`);

        // Complex Quality Check
        const minSpend = parseFloat(campaign.min_spend) || 0;
        const earningValue = parseFloat(campaign.earning) || 0;
        const hasMathError = earningValue >= minSpend && minSpend > 10;
        const isIncomplete = campaign.ai_parsing_incomplete;

        if (hasMathError || isIncomplete || !campaign.slug) {
            console.log(`   🛠  Issue detected (Math: ${hasMathError}, Incomplete: ${isIncomplete}). Re-processing...`);

            try {
                // Re-parse with enhanced Gemini prompts
                // We use title + description as base text if raw_content is missing
                const baseText = campaign.raw_content || `${campaign.title} ${campaign.description}`;
                const result = await parseWithGemini(baseText, campaign.url || '', campaign.bank);

                if (result) {
                    // Update the row
                    const { error: updateError } = await supabase
                        .from('campaigns')
                        .update({
                            ...result,
                            ai_parsing_incomplete: false,
                            auto_corrected: true,
                            quality_score: 100 // Reset quality score once AI fixes it
                        })
                        .eq('id', campaign.id);

                    if (updateError) {
                        console.error(`   ❌ Failed to update [${campaign.id}]:`, updateError.message);
                    } else {
                        console.log(`   ✅ Successfully corrected [${campaign.id}]`);
                    }
                }
            } catch (err) {
                console.error(`   ❌ Error re-processing [${campaign.id}]:`, err);
            }

            // Wait to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log(`   ✨ Quality OK.`);
            // Update quality score if it was low but passed our manual check
            await supabase.from('campaigns').update({ quality_score: 90 }).eq('id', campaign.id);
        }
    }

    console.log('\n🏁 Auto-Correction Cycle Finished.');
}

autoCorrect();
