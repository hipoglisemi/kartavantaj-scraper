import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseSurgical } from './src/services/geminiParser';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function auditDates() {
    console.log('📅 Starting Date Audit...');

    // 1. Identify suspicious dates
    // - null dates
    // - dates far in the future (placeholder like 2026-12-31 used by AI sometimes incorrectly)
    // - mismatched dates (valid_from > valid_until)

    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .or('valid_until.is.null,valid_until.gt.2026-11-01');

    if (error) {
        console.error('❌ Error fetching campaigns:', error.message);
        return;
    }

    console.log(`📊 Found ${data.length} candidate campaigns for date correction.`);

    let fixedCount = 0;

    for (const c of data) {
        console.log(`🔍 Auditing ID ${c.id}: "${c.title.substring(0, 50)}..."`);

        // Use Gemini Surgical mode for dates
        const result = await parseSurgical(
            c.description + '\n' + (c.conditions?.join('\n') || ''),
            c,
            ['valid_from', 'valid_until'],
            c.url,
            c.bank
        );

        if (result && result.valid_until && result.valid_until !== c.valid_until) {
            console.log(`   ✨ Correction: ${c.valid_until} -> ${result.valid_until}`);

            const { error: updateError } = await supabase
                .from('campaigns')
                .update({
                    valid_from: result.valid_from || c.valid_from,
                    valid_until: result.valid_until,
                    auto_corrected: true,
                    math_flags: ['fixed_date_audit']
                })
                .eq('id', c.id);

            if (!updateError) fixedCount++;
        } else {
            console.log(`   ✅ Date looks correct or AI confirms current.`);
        }
    }

    console.log(`\n✅ Finished. Total dates corrected: ${fixedCount}`);
}

auditDates();
