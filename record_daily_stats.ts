import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function recordDailyStats() {
    console.log('🚀 Recording Daily Statistics...');

    // 1. Fetch Stats
    const { count: totalCount } = await supabase.from('campaigns').select('id', { count: 'exact', head: true });
    const { count: activeCount } = await supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('is_active', true);
    const { count: approvedCount } = await supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('is_approved', true);

    const { data: allData, error: fetchError } = await supabase
        .from('campaigns')
        .select('id, bank, brand, sector_slug, category, ai_parsing_incomplete');

    if (fetchError || !allData) {
        console.error('❌ Failed to fetch data:', fetchError?.message);
        return;
    }

    const stats = {
        noBrand: 0,
        noSector: 0,
        noCategory: 0,
        aiIncomplete: 0
    };

    const banks: Record<string, { total: number, missingBrand: number, missingSector: number }> = {};

    allData.forEach(c => {
        if (!c.brand || c.brand.trim() === '' || c.brand.toLowerCase().includes('genel')) stats.noBrand++;
        if (!c.sector_slug || c.sector_slug === 'diger') stats.noSector++;
        if (!c.category || c.category === 'Diğer') stats.noCategory++;
        if (c.ai_parsing_incomplete) stats.aiIncomplete++;

        // Bank breakdown
        if (!banks[c.bank]) banks[c.bank] = { total: 0, missingBrand: 0, missingSector: 0 };
        banks[c.bank].total++;
        if (!c.brand || c.brand.trim() === '' || c.brand.toLowerCase().includes('genel')) banks[c.bank].missingBrand++;
        if (!c.sector_slug || c.sector_slug === 'diger') banks[c.bank].missingSector++;
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
        bank_breakdown: banks,
        metadata: {
            run_date: new Date().toISOString()
        }
    };

    // 3. Insert into DB
    const { error: insertError } = await supabase
        .from('system_statistics')
        .insert([payload]);

    if (insertError) {
        console.error('❌ Failed to save statistics:', insertError.message);
        console.log('💡 Note: Make sure the system_statistics table exists.');
    } else {
        console.log('✅ Statistics saved successfully!');
    }
}

recordDailyStats().catch(err => console.error('❌ Execution Error:', err));
