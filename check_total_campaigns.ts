import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTotalCampaigns() {
    console.log('🔍 Veritabanındaki tüm kampanyaları kontrol ediyorum...\n');

    // Get total count
    const { count, error: countError } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Hata:', countError);
        return;
    }

    console.log(`📊 Toplam kampanya sayısı: ${count}\n`);

    // Get all campaigns with basic info
    const { data: allCampaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name, is_approved, is_active, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Hata:', error);
        return;
    }

    if (!allCampaigns || allCampaigns.length === 0) {
        console.log('⚠️  Hiç kampanya bulunamadı!');
        return;
    }

    // Count by status
    const approved = allCampaigns.filter(c => c.is_approved).length;
    const notApproved = allCampaigns.filter(c => !c.is_approved).length;
    const inactive = allCampaigns.filter(c => !c.is_active).length;

    console.log('📈 Durum Özeti:');
    console.log(`   ✅ Onaylı (is_approved=true): ${approved}`);
    console.log(`   ⏳ Onaysız (is_approved=false): ${notApproved}`);
    console.log(`   🔒 Pasif (is_active=false): ${inactive}\n`);

    // Group by bank
    const byBank: Record<string, number> = {};
    allCampaigns.forEach(c => {
        const bank = c.bank || 'Bilinmeyen';
        byBank[bank] = (byBank[bank] || 0) + 1;
    });

    console.log('🏦 Bankaya Göre Dağılım:');
    Object.entries(byBank)
        .sort((a, b) => b[1] - a[1])
        .forEach(([bank, count]) => {
            console.log(`   ${bank}: ${count}`);
        });

    console.log('\n📅 Son 10 kampanya:');
    console.log('─'.repeat(120));
    allCampaigns.slice(0, 10).forEach(c => {
        const approvedIcon = c.is_approved ? '✅' : '❌';
        const activeIcon = c.is_active ? '✅' : '🔒';
        const title = (c.title || 'Başlık yok').substring(0, 60);
        const date = new Date(c.created_at).toLocaleDateString('tr-TR');

        console.log(`${approvedIcon} ${activeIcon} [${date}] ID:${c.id} - ${title}`);
    });
    console.log('─'.repeat(120));
}

checkTotalCampaigns().catch(console.error);
