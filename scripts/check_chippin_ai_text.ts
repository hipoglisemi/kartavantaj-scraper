import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkChippinMarketingText() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, ai_marketing_text, description')
        .eq('bank', 'Chippin')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('📊 Chippin Campaigns ai_marketing_text Status:\n');

    let nullCount = 0;
    let filledCount = 0;

    data?.forEach(c => {
        const status = c.ai_marketing_text ? '✅' : '❌';
        const wordCount = c.ai_marketing_text?.split(/\s+/).length || 0;

        console.log(`${status} ${c.title.substring(0, 50)}...`);
        console.log(`   ai_marketing_text: ${c.ai_marketing_text || 'NULL'} (${wordCount} words)`);
        console.log(`   description: ${c.description?.substring(0, 80)}...\n`);

        if (c.ai_marketing_text) filledCount++;
        else nullCount++;
    });

    console.log(`\nSummary: ${filledCount} filled, ${nullCount} null`);
}

checkChippinMarketingText();
