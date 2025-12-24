
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function monitor() {
    // Clear console for dashboard effect
    console.clear();
    const now = new Date();
    console.log(`\n📊 KARTAVANTAJ CANLI TARAMA İZLEME PANELİ`);
    console.log(`==========================================`);
    console.log(`🕒 Son Güncelleme: ${now.toLocaleTimeString()}`);
    console.log(`ℹ️  GitHub Actions taramayı sürdürürken veritabanına akan verileri izliyoruz...\n`);

    try {
        // 1. Total Count
        const { count: total, error: err1 } = await supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true });

        // 2. Fetch specific fields for aggregation (limit to recent ones to avoid heavy load if DB gets huge, but for now full scan is okay for < 5000 rows)
        // Actually, fetching all id, bank, ai_enhanced is lightweight enough for <10k rows
        const { data: bankData, error: err2 } = await supabase
            .from('campaigns')
            .select('bank, is_active, ai_enhanced, conditions, created_at');

        if (err1 || err2) {
            console.error("❌ Veri çekme hatası:", err1 || err2);
            return;
        }

        if (!bankData || bankData.length === 0) {
            console.log("🚫 Veritabanı şu an BOŞ. Tarama henüz başlamamış veya veri yazmamış olabilir.");
            console.log("🔄 Bekleniyor...");
            return;
        }

        // Aggregate Data
        const stats = bankData.reduce((acc: any, curr) => {
            const bank = curr.bank || 'Bilinmiyor';
            if (!acc[bank]) acc[bank] = { total: 0, active: 0, ai: 0, conditions: 0 };

            acc[bank].total++;
            if (curr.is_active) acc[bank].active++;
            if (curr.ai_enhanced) acc[bank].ai++;
            if (curr.conditions && Array.isArray(curr.conditions) && curr.conditions.length > 0) acc[bank].conditions++;

            return acc;
        }, {});

        // Format Table Data
        const tableData = Object.entries(stats).map(([bank, data]: any) => ({
            "Banka": bank,
            "Toplam": data.total,
            "AI İşli": data.ai,
            "Koşullu": data.conditions,
            "AI Oranı": `%${Math.round((data.ai / data.total) * 100) || 0}`,
            "Kalite": `%${Math.round((data.conditions / data.total) * 100) || 0}`
        }));

        // Sort by Total desc
        tableData.sort((a, b) => b.Toplam - a.Toplam); // Sort by Total count

        console.table(tableData);

        console.log(`\n📈 GENEL DURUM:`);
        console.log(`   📦 Toplam Kampanya: ${total}`);

        // Latest Entry
        const sorted = bankData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        if (sorted.length > 0) {
            const lastRow = sorted[0];
            const lastTime = new Date(lastRow.created_at).toLocaleTimeString();
            // Fetch title for last row separately or include in initial select? Let's include title in initial scan if not too heavy. 
            // Actually, let's just do a separate quick query for the single latest title to keep the big query light.
            const { data: latestTitle } = await supabase
                .from('campaigns')
                .select('title')
                .eq('created_at', lastRow.created_at)
                .limit(1)
                .single();

            const titleDisplay = latestTitle ? latestTitle.title.substring(0, 50) + (latestTitle.title.length > 50 ? '...' : '') : '???';
            console.log(`   🆕 Son Eklenen: [${lastRow.bank}] ${titleDisplay} (@ ${lastTime})`);
        }

        console.log("\n🔄 Veriler 10 saniyede bir güncelleniyor... (Durdurmak için Ctrl+C)");

    } catch (e) {
        console.error("Monitor Error:", e);
    }
}

// Initial run
monitor();

// Loop every 10 seconds
setInterval(monitor, 10000);
