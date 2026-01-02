import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseSurgical } from './src/services/geminiParser';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function auditCards() {
    console.log('💳 Starting Eligible Cards Audit...');

    // Identify campaigns with empty or generic eligible_customers
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .or('eligible_customers.is.null,eligible_customers.eq.{}');

    if (error) {
        console.error('❌ Error fetching campaigns:', error.message);
        return;
    }

    console.log(`📊 Found ${data.length} candidate campaigns for card correction.`);

    let fixedCount = 0;

    for (const c of data) {
        console.log(`🔍 Auditing ID ${c.id}: "${c.title.substring(0, 50)}..."`);

        const result = await parseSurgical(
            c.description + '\n' + (c.conditions?.join('\n') || ''),
            c,
            ['eligible_customers'],
            c.url,
            c.bank
        );

        if (result && result.eligible_customers && result.eligible_customers.length > 0) {
            console.log(`   ✨ Correction: [${result.eligible_customers.join(', ')}]`);

            const { error: updateError } = await supabase
                .from('campaigns')
                .update({
                    eligible_customers: result.eligible_customers,
                    auto_corrected: true,
                    math_flags: ['fixed_card_audit']
                })
                .eq('id', c.id);

            if (!updateError) fixedCount++;
        } else {
            console.log(`   ✅ Cards look correct or AI confirms current.`);
        }
    }

    console.log(`\n✅ Finished. Total campaigns fixed: ${fixedCount}`);
}

auditCards();
