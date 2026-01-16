import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkMissingUrls() {
    console.log('🔍 URL Eksikliği Analizi\n');
    console.log('='.repeat(60));

    // Toplam kampanya
    const { count: total } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

    console.log(`Toplam Kampanya: ${total}`);

    // URL null olanlar
    const { count: nullUrl } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .is('url', null);

    console.log(`URL = null: ${nullUrl}`);

    // URL boş string olanlar
    const { count: emptyUrl } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('url', '');

    console.log(`URL = '': ${emptyUrl}`);

    // URL eksik olanlar (null veya boş)
    const { data: missingUrls } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name, url, reference_url, created_at')
        .or('url.is.null,url.eq.')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log(`\n📋 URL Eksik Kampanyalar (Son 20):`);
    console.log('='.repeat(60));

    if (missingUrls && missingUrls.length > 0) {
        missingUrls.forEach((c, i) => {
            console.log(`\n${i + 1}. [ID: ${c.id}] ${c.title.substring(0, 50)}...`);
            console.log(`   Banka: ${c.bank} | Kart: ${c.card_name}`);
            console.log(`   URL: ${c.url || 'YOK'}`);
            console.log(`   Reference URL: ${c.reference_url || 'YOK'}`);
            console.log(`   Tarih: ${c.created_at}`);
        });
    } else {
        console.log('✅ Tüm kampanyalarda URL var!');
    }

    // Banka bazında analiz
    console.log('\n\n📊 Banka Bazında URL Eksikliği:');
    console.log('='.repeat(60));

    const { data: banks } = await supabase
        .from('campaigns')
        .select('bank')
        .or('url.is.null,url.eq.')
        .order('bank');

    if (banks && banks.length > 0) {
        const bankCounts: Record<string, number> = {};
        banks.forEach(b => {
            bankCounts[b.bank] = (bankCounts[b.bank] || 0) + 1;
        });

        Object.entries(bankCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([bank, count]) => {
                console.log(`${bank}: ${count} kampanya`);
            });
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 ÖZET:`);
    console.log(`Toplam: ${total}`);
    console.log(`URL Eksik: ${(nullUrl || 0) + (emptyUrl || 0)}`);
    console.log(`Oran: %${(((nullUrl || 0) + (emptyUrl || 0)) / (total || 1) * 100).toFixed(2)}`);
}

checkMissingUrls().catch(console.error);
