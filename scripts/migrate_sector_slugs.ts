import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function migrateSectors() {
    console.log('Sektör slug migrasyonu başlıyor...');

    const mapping: Record<string, string> = {
        'yemek': 'restoran-kafe',
        'seyahat': 'turizm-konaklama',
        'market': 'market-gida',
        'mobilya': 'mobilya-dekorasyon',
        'giyim': 'giyim-aksesuar',
        'insurance': 'sigorta',
        'saglik': 'kozmetik-saglik',
        'education': 'egitim',
        'educational': 'egitim',
        'electronics': 'elektronik',
        'fashion': 'giyim-aksesuar',
        'clothing': 'giyim-aksesuar',
        'food': 'restoran-kafe',
        'fuel': 'akaryakit',
        'auto': 'otomotiv',
        'vehicle-maintenance': 'otomotiv',
        'entertainment': 'kultur-sanat',
        'ev-yasam': 'mobilya-dekorasyon',
        'oyuncak': 'diger',
        'ecommerce': 'e-ticaret',
        'digital-platform': 'dijital-platform'
    };

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, sector_slug');

    if (error || !campaigns) {
        console.error(error);
        return;
    }

    let updateCount = 0;

    for (const campaign of campaigns) {
        if (campaign.sector_slug && mapping[campaign.sector_slug]) {
            const newSlug = mapping[campaign.sector_slug];
            console.log(`- [${campaign.id}] Migrating sector: ${campaign.sector_slug} -> ${newSlug}`);

            const { error: updateError } = await supabase
                .from('campaigns')
                .update({ sector_slug: newSlug })
                .eq('id', campaign.id);

            if (updateError) {
                console.error(`Error updating ${campaign.id}:`, updateError);
            } else {
                updateCount++;
            }
        }
    }

    console.log(`\nMigrasyon tamamlandı. ${updateCount} kampanya güncellendi.`);
}

migrateSectors();
