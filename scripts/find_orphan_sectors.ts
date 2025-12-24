import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function findOrphanSectors() {
    const { data: masterSectors } = await supabase.from('master_sectors').select('slug');
    const validSlugs = new Set(masterSectors?.map(s => s.slug) || []);

    const { data: campaigns } = await supabase.from('campaigns').select('id, sector_slug, title');

    if (!campaigns) return;

    const orphans = campaigns.filter(c => c.sector_slug && !validSlugs.has(c.sector_slug));

    console.log(`Bulunan yetim/hatalı slug sayısı: ${orphans.length}`);

    const counts: Record<string, number> = {};
    orphans.forEach(c => {
        counts[c.sector_slug!] = (counts[c.sector_slug!] || 0) + 1;
    });

    console.log('Hatalı Slug Dağılımı:');
    console.log(JSON.stringify(counts, null, 2));

    console.log('\nÖrnek Kampanyalar:');
    orphans.slice(0, 10).forEach(c => {
        console.log(`- [${c.id}] Slug: ${c.sector_slug} | Title: ${c.title}`);
    });
}

findOrphanSectors();
