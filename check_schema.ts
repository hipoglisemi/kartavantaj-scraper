import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkSchema() {
    console.log('🔍 Checking Supabase campaigns table schema...\n');

    try {
        // Fetch a single campaign to see what columns exist
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .limit(1);

        if (error) {
            console.error('❌ Error fetching campaigns:', error.message);
            return;
        }

        if (!data || data.length === 0) {
            console.log('⚠️ No campaigns found in database');
            return;
        }

        const columns = Object.keys(data[0]);
        console.log('📋 Existing columns in campaigns table:');
        console.log('─'.repeat(50));
        columns.sort().forEach((col, i) => {
            console.log(`${(i + 1).toString().padStart(2)}. ${col}`);
        });
        console.log('─'.repeat(50));
        console.log(`\nTotal: ${columns.length} columns\n`);

        // Check for specific columns that scrapers use
        const requiredColumns = [
            'is_active',
            'brand',
            'min_spend',
            'earning',
            'ai_parsing_incomplete',
            'image_url',
            'reference_url',
            'bank',
            'card_name'
        ];

        console.log('🔎 Checking required columns:');
        console.log('─'.repeat(50));
        requiredColumns.forEach(col => {
            const exists = columns.includes(col);
            const status = exists ? '✅' : '❌';
            console.log(`${status} ${col}`);
        });
        console.log('─'.repeat(50));

        const missing = requiredColumns.filter(col => !columns.includes(col));
        if (missing.length > 0) {
            console.log(`\n⚠️ Missing ${missing.length} required columns:`);
            missing.forEach(col => console.log(`   - ${col}`));
        } else {
            console.log('\n✅ All required columns exist!');
        }

    } catch (err: any) {
        console.error('❌ Unexpected error:', err.message);
    }
}

checkSchema();
