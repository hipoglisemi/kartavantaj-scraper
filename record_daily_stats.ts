import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function recordDailyStats() {
    console.log('🚀 Recording Advanced Daily Statistics...');

    // 1. Fetch Stats
    const { count: totalCount } = await supabase.from('campaigns').select('id', { count: 'exact', head: true });
    const { count: activeCount } = await supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('is_active', true);
    const { count: approvedCount } = await supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('is_approved', true);

    const { data: allData, error: fetchError } = await supabase
        .from('campaigns')
        .select('id, title, bank, brand, sector_slug, category, ai_parsing_incomplete, min_spend, earning, description');

    if (fetchError || !allData) {
        console.error('❌ Failed to fetch data:', fetchError?.message);
        return;
    }

    const stats = {
        noBrand: 0,
        noSector: 0,
        noCategory: 0,
        aiIncomplete: 0,
        mathErrors: 0,
        textMismatches: 0
    };

    const banks: Record<string, { total: number, missingBrand: number, errors: number }> = {};

    allData.forEach(c => {
        // Basic Metadata Checks
        const isGenericBrand = !c.brand || c.brand.trim() === '' || c.brand.toLowerCase().includes('genel');
        const isGenericSector = !c.sector_slug || c.sector_slug === 'diger';

        if (isGenericBrand) stats.noBrand++;
        if (isGenericSector) stats.noSector++;
        if (!c.category || c.category === 'Diğer') stats.noCategory++;
        if (c.ai_parsing_incomplete) stats.aiIncomplete++;

        // --- Advanced Math Checks ---
        const minSpend = parseFloat(c.min_spend) || 0;
        const earning = parseFloat(c.earning) || 0;

        // Error if earning > minSpend (usually impossible or a scale error like 500TL kazanmak vs 50TL harcamak)
        // OR very suspicious earning to spend ratio (e.g. 1000TL spend for 1TL earn is okay, but 100TL earn for 10TL spend is wrong)
        if (earning > 0 && minSpend > 0) {
            if (earning >= minSpend && minSpend > 10) { // If you earn more than you spend, its likely an error
                stats.mathErrors++;
            }
        }

        // --- Text Mismatch Checks ---
        const titleText = (c.title || '').toLowerCase();
        const descText = (c.description || '').toLowerCase();

        // Check if title mentions a number that is drastically different from earning field
        // E.g. Title says "1000 TL Chip-Para" but earning field is 100
        const numbersInTitle = titleText.match(/\d+/g) || [];
        if (numbersInTitle.includes(earning.toString()) === false && earning > 0) {
            // Suspicious, but we need more logic to be sure. 
            // Let's check if high value numbers exist in title but earning is small.
            const hasHighValueInTitle = numbersInTitle.some((n: string) => parseInt(n) >= 100);
            if (hasHighValueInTitle && earning < 10 && earning > 0) {
                stats.textMismatches++;
            }
        }

        // Bank breakdown
        if (!banks[c.bank]) banks[c.bank] = { total: 0, missingBrand: 0, errors: 0 };
        banks[c.bank].total++;
        if (isGenericBrand) banks[c.bank].missingBrand++;
        if (c.ai_parsing_incomplete || (earning >= minSpend && minSpend > 10)) banks[c.bank].errors++;
    });

    // 2. Prepare Payload
    const payload = {
        total_campaigns: totalCount || 0,
        active_campaigns: activeCount || 0,
        approved_campaigns: approvedCount || 0,
        missing_brand_count: stats.noBrand,
        missing_sector_count: stats.noSector,
        missing_category_count: stats.noCategory,
        ai_incomplete_count: stats.aiIncomplete,
        math_error_count: stats.mathErrors,
        text_mismatch_count: stats.textMismatches,
        bank_breakdown: banks,
        metadata: {
            run_date: new Date().toISOString(),
            engine_version: "2.0.0"
        }
    };

    // 3. Insert into DB
    const { error: insertError } = await supabase
        .from('system_statistics')
        .insert([payload]);

    if (insertError) {
        console.error('❌ Failed to save statistics:', insertError.message);
    } else {
        console.log('✅ Advanced statistics saved successfully!');
    }
}

recordDailyStats().catch(err => console.error('❌ Execution Error:', err));
