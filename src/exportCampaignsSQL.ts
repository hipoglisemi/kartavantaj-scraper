/**
 * Export Campaigns from Supabase as SQL INSERT statements
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

function escapeSQL(value: any): string {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    if (typeof value === 'number') {
        return value.toString();
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (Array.isArray(value)) {
        return `ARRAY[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ')}]`;
    }
    // String
    return `'${String(value).replace(/'/g, "''")}'`;
}

async function exportCampaignsAsSQL() {
    console.log('\n🔍 Fetching WorldCard campaigns from Supabase...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('provider', 'World Card (Yapı Kredi)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching campaigns:', error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('⚠️  No WorldCard campaigns found');
        return;
    }

    console.log(`✅ Found ${campaigns.length} campaigns\n`);

    // Generate SQL INSERT statements
    let sqlOutput = `-- WorldCard Campaigns Export\n`;
    sqlOutput += `-- Generated: ${new Date().toISOString()}\n`;
    sqlOutput += `-- Total: ${campaigns.length} campaigns\n\n`;

    campaigns.forEach((campaign, index) => {
        const fields = Object.keys(campaign).filter(key =>
            campaign[key] !== null &&
            campaign[key] !== undefined &&
            key !== 'id' // Skip auto-generated ID
        );

        const values = fields.map(field => escapeSQL(campaign[field]));

        sqlOutput += `-- Campaign ${index + 1}: ${campaign.title}\n`;
        sqlOutput += `INSERT INTO campaigns (${fields.join(', ')}) VALUES\n`;
        sqlOutput += `  (${values.join(', ')});\n\n`;
    });

    // Save to file
    const outputPath = './output/campaigns_export.sql';
    fs.mkdirSync('./output', { recursive: true });
    fs.writeFileSync(outputPath, sqlOutput, 'utf-8');

    console.log(`💾 SQL export saved to: ${outputPath}\n`);

    // Also print summary
    console.log('📊 CAMPAIGN SUMMARY:\n');
    console.log('━'.repeat(80));

    campaigns.forEach((c, i) => {
        console.log(`${i + 1}. ${c.title}`);
        console.log(`   Badge: ${c.badge_text || 'N/A'} | Category: ${c.category || 'N/A'}`);
        console.log(`   Valid Until: ${c.valid_until || 'N/A'} | Min Spend: ${c.min_spend || 'N/A'}`);
        console.log(`   AI Enhanced: ${c.ai_enhanced ? '✅' : '❌'}`);
        console.log('');
    });

    console.log('━'.repeat(80));
    console.log(`\nTotal: ${campaigns.length} campaigns exported\n`);
}

exportCampaignsAsSQL().catch(console.error);
