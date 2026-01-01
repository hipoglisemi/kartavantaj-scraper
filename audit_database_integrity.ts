
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function auditDatabase() {
    console.log('\n🔍 Kapsamlı Veritabanı Denetimi Başlıyor...\n');

    // 1. Overview by Bank
    const { data: bankStats, error: bankError } = await supabase
        .from('campaigns')
        .select('bank, bank_id, card_id, brand_id, sector_id');

    if (bankError) {
        console.error('❌ DB Hatası:', bankError.message);
        return;
    }

    const total = bankStats.length;
    const stats: any = {};

    bankStats.forEach(c => {
        const bank = c.bank || 'BİLİNMEYEN BANKA';
        if (!stats[bank]) {
            stats[bank] = {
                total: 0,
                missing_bank_id: 0,
                missing_card_id: 0,
                missing_brand_id: 0,
                missing_sector_id: 0
            };
        }
        stats[bank].total++;
        if (!c.bank_id) stats[bank].missing_bank_id++;
        if (!c.card_id) stats[bank].missing_card_id++;
        if (!c.brand_id) stats[bank].missing_brand_id++;
        if (!c.sector_id) stats[bank].missing_sector_id++;
    });

    console.log('📊 BANKA BAZLI DATALAR & SAĞLIK DURUMU:');
    console.table(
        Object.keys(stats).map(bank => ({
            OnlyBankName: bank, // Display name for table width
            Count: stats[bank].total,
            'No BankID': stats[bank].missing_bank_id,
            'No CardID': `${stats[bank].missing_card_id} (%${((stats[bank].missing_card_id / stats[bank].total) * 100).toFixed(0)})`,
            'No SectorID': stats[bank].missing_sector_id,
            'No BrandID': stats[bank].missing_brand_id
        }))
    );

    // 2. Check for "Axess" quality vs others
    console.log('\n🏆 REFERANS (AXESS) VS DİĞERLERİ KARŞILAŞTIRMASI:');
    const axessStats = stats['Akbank'] || { total: 0, missing_card_id: 0 };
    console.log(`   - Akbank (Pilot): Toplam ${axessStats.total} kampanya. Eksik Kart ID: ${axessStats.missing_card_id}`);

    // Identify worst performers
    const worstBanks = Object.keys(stats)
        .filter(b => stats[b].total > 0)
        .sort((a, b) => (stats[b].missing_card_id / stats[b].total) - (stats[a].missing_card_id / stats[a].total));

    console.log(`   - 🚨 En Sorunlu Scraper: ${worstBanks[worstBanks.length - 1]} (%${((stats[worstBanks[worstBanks.length - 1]].missing_card_id / stats[worstBanks[worstBanks.length - 1]].total) * 100).toFixed(0)} eksik)`);


    // 3. ID Validation (Check if text exists but ID is null)
    const { data: orphans } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name, sector_slug')
        .or('bank_id.is.null,card_id.is.null,sector_id.is.null')
        .limit(5);

    if (orphans && orphans.length > 0) {
        console.log('\n🐛 ÖRNEK SORUNLU KAYITLAR (ID EKSİK):');
        orphans.forEach(o => {
            console.log(`   [${o.id}] ${o.bank} - ${o.card_name || 'KART_YOK'} - ${o.sector_slug || 'SEKTOR_YOK'}`);
        });
    }
}

auditDatabase();
