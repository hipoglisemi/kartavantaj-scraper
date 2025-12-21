import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkCampaignsSchema() {
    console.log('🔍 Checking campaigns table schema...\n');

    // Fetch one campaign to see all columns
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ No campaigns found');
        return;
    }

    const campaign = data[0];
    const columns = Object.keys(campaign);

    console.log('📋 Campaigns table columns:');
    console.log('─'.repeat(60));
    columns.sort().forEach((col, i) => {
        const value = campaign[col];
        const type = typeof value;
        const preview = value === null ? 'null' :
            type === 'string' ? `"${value.substring(0, 30)}..."` :
                String(value);
        console.log(`${(i + 1).toString().padStart(2)}. ${col.padEnd(25)} (${type.padEnd(8)}) ${preview}`);
    });
    console.log('─'.repeat(60));
    console.log(`\nTotal: ${columns.length} columns`);

    // Check critical fields
    console.log('\n🔎 Critical field mapping:');
    console.log('─'.repeat(60));
    const criticalFields = [
        'category',      // Sektör
        'sector_slug',   // Sektör slug
        'brand',         // Marka
        'bank',          // Banka
        'card_name',     // Kart adı
        'is_active',     // Aktif mi
        'reference_url'  // Unique identifier
    ];

    criticalFields.forEach(field => {
        const exists = columns.includes(field);
        const status = exists ? '✅' : '❌';
        console.log(`${status} ${field}`);
    });
}

checkCampaignsSchema();
