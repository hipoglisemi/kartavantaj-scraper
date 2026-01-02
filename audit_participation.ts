import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseSurgical } from './src/services/geminiParser';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function auditParticipation() {
    console.log('📣 Starting Participation Method Audit...');

    // Identify campaigns with empty or generic participation_method
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .or('participation_method.is.null,participation_method.eq.""');

    if (error) {
        console.error('❌ Error fetching campaigns:', error.message);
        return;
    }

    console.log(`📊 Found ${data.length} candidate campaigns for participation correction.`);

    let fixedCount = 0;

    for (const c of data) {
        console.log(`🔍 Auditing ID ${c.id}: "${c.title.substring(0, 50)}..."`);

        const result = await parseSurgical(
            c.description + '\n' + (c.conditions?.join('\n') || ''),
            c,
            ['participation_method'],
            c.url,
            c.bank
        );

        if (result && result.participation_method && result.participation_method !== c.participation_method) {
            console.log(`   ✨ Correction: "${result.participation_method}"`);

            const { error: updateError } = await supabase
                .from('campaigns')
                .update({
                    participation_method: result.participation_method,
                    auto_corrected: true,
                    math_flags: ['fixed_participation_audit']
                })
                .eq('id', c.id);

            if (!updateError) fixedCount++;
        } else {
            console.log(`   ✅ Participation looks correct or AI confirms current.`);
        }
    }

    console.log(`\n✅ Finished. Total campaigns fixed: ${fixedCount}`);
}

auditParticipation();
