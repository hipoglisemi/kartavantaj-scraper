import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkSectors() {
    console.log('Sektör verileri kontrol ediliyor...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, sector_slug, sector_name, title')
        .limit(1000);

    if (error || !data) {
        console.error(error);
        return;
    }

    const suspicious = data.filter((c: any) => {
        // Eğer sector_name boşsa veya slug ile aynıysa (ve slug 'diger' değilse) şüphelidir
        return !c.sector_name || (c.sector_name === c.sector_slug && c.sector_slug !== 'diger');
    });

    console.log(`Toplam ${suspicious.length} şüpheli kampanya bulundu.\n`);

    suspicious.slice(0, 20).forEach((c: any) => {
        console.log(`- [${c.id}] Slug: ${c.sector_slug} | Name: ${c.sector_name}`);
        console.log(`  Title: ${c.title}`);
    });
}

checkSectors();
