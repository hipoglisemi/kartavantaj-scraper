
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function fixSectorIDs() {
    console.log('🔄 Global Sector ID Sync...');

    // 1. Fetch Master Sectors Map
    const { data: sectors } = await supabase.from('master_sectors').select('id, slug');
    if (!sectors) return;

    const slugMap: Record<string, number> = {};
    sectors.forEach(s => slugMap[s.slug] = s.id);

    console.log(`Loaded ${sectors.length} sectors into map.`);

    // 2. Fetch campaigns with missing sector_id but having sector_slug
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, sector_slug')
        .is('sector_id', null)
        .not('sector_slug', 'is', null)
        .limit(1000); // Batch size

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No campaigns found with missing sector IDs.');
        return;
    }

    // Map verbose slugs (scrapers) to master slugs (short)
    const manualMap: Record<string, string> = {
        'giyim-ve-aksesuar': 'giyim-aksesuar',
        'market-ve-gida': 'market-gida',
        'mobilya-ve-dekorasyon': 'mobilya-dekorasyon',
        'turizm-ve-konaklama': 'turizm-konaklama',
        'restoran-ve-kafe': 'restoran-kafe',
        'kozmetik-ve-saglik': 'kozmetik-saglik',
        'kultur-ve-sanat': 'kultur-sanat',
        'optik-ve-saat': 'kuyum-optik-saat', // Approximate match
        'kuyum-optik-saat': 'kuyum-optik-saat',
        'vergi-ve-kamu': 'vergi-kamu',
        'kuyum': 'kuyum-optik-saat',
        'ev-mobilya-beyaz-esya': 'mobilya-dekorasyon',
        'market-gida': 'market-gida', // Self match just in case
        'akaryakit-otogaz': 'akaryakit'
    };

    // Add variations without 've' just in case

    console.log(`Found ${campaigns.length} orphan campaigns. Fixing...`);

    let fixed = 0;
    for (const c of campaigns) {
        let slug = c.sector_slug;

        // Try direct match
        let targetId = slugMap[slug];

        // Try mapped match
        if (!targetId && manualMap[slug]) {
            targetId = slugMap[manualMap[slug]];
        }

        if (targetId) {
            const { error } = await supabase
                .from('campaigns')
                .update({ sector_id: targetId })
                .eq('id', c.id);
            if (!error) fixed++;
        } else {
            console.log(`⚠️ Unknown slug: ${c.sector_slug} (Campaign ${c.id})`);
        }
    }

    console.log(`✅ Fixed ${fixed}/${campaigns.length} sector IDs.`);
}
fixSectorIDs();
