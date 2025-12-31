import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function analyzeZiraat() {
    const targetIds = [15240, 15239, 15214];

    console.log('--- Belirtilen Hatalı Kampanyalar ---');
    const { data: specific, error: err1 } = await supabase
        .from('campaigns')
        .select('*')
        .in('id', targetIds);

    if (err1) console.error('Hata:', err1);
    else {
        specific?.forEach(c => {
            console.log(`ID: ${c.id} | Başlık: ${c.title}`);
            console.log(`Detay (400 chars): ${c.description?.substring(0, 400)}...`);
            console.log(`Koşullar (JSON): ${JSON.stringify(c.conditions)}`);
            console.log(`Katılım (JSON): ${JSON.stringify(c.participation_points)}`);
            console.log(`URL: ${c.url}`);
            console.log(`Resim: ${c.image ? 'Var' : 'YOK'}`);
            console.log(`Min Spend: ${c.min_spend} | Earning: ${c.earning}`);
            console.log('-------------------');
        });
    }

    console.log('\n--- Ziraat Yapısal Veri Analizi ---');
    const { data: allZiraat, error: err2 } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'Ziraat');

    if (err2) {
        console.error('Hata:', err2);
    } else {
        const total = allZiraat?.length || 0;
        let shallowDescription = 0;
        let emptyConditions = 0;
        let emptyParticipation = 0;
        let problematicIDs: number[] = [];

        allZiraat?.forEach(c => {
            const desc = c.description?.toLowerCase() || '';
            const isShallow = desc.includes('tıklayın') || desc.includes('detaylı bilgi') || desc.length < 100;

            const hasNoConditions = !c.conditions || c.conditions.length === 0;
            const hasNoParticipation = !c.participation_points || c.participation_points.length === 0;

            if (isShallow) shallowDescription++;
            if (hasNoConditions) emptyConditions++;
            if (hasNoParticipation) emptyParticipation++;

            if (isShallow || hasNoConditions) {
                problematicIDs.push(c.id);
            }
        });

        console.log(`Toplam Kampanya: ${total}`);
        console.log(`⚠️  Özet/Sığ Açıklama ("tıklayın" vb.): ${shallowDescription}`);
        console.log(`⚠️  Koşulları Boş Olanlar: ${emptyConditions}`);
        console.log(`⚠️  Katılım Adımları Boş: ${emptyParticipation}`);
        console.log(`\n🔍 Örnek Sorunlu ID'ler (İlk 10): ${problematicIDs.slice(0, 10).join(', ')}`);

        // Check specifically the user mentioned IDs for patterns
        console.log('\n--- Kullanıcının Belirttiği ID Analizi ---');
        allZiraat?.filter(c => targetIds.includes(c.id)).forEach(c => {
            console.log(`ID ${c.id}:`);
            console.log(`  - Açıklama Uzunluğu: ${c.description?.length}`);
            console.log(`  - "Tıklayın" içeriyor mu?: ${c.description?.toLowerCase().includes('tıklayın') ? 'EVET' : 'HAYIR'}`);
            console.log(`  - Koşul Sayısı: ${c.conditions?.length || 0}`);
        });
    }
}

analyzeZiraat();
