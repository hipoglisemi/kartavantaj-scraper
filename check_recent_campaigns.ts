import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentCampaigns() {
    console.log('🔍 Son eklenen kampanyaları kontrol ediyorum...\n');

    // Get the 20 most recent campaigns
    const { data: recentCampaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name, is_approved, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('❌ Hata:', error);
        return;
    }

    if (!recentCampaigns || recentCampaigns.length === 0) {
        console.log('⚠️  Hiç kampanya bulunamadı!');
        return;
    }

    console.log(`📊 Toplam ${recentCampaigns.length} son kampanya:\n`);

    // Count by status
    const approved = recentCampaigns.filter(c => c.is_approved).length;
    const notApproved = recentCampaigns.filter(c => !c.is_approved).length;
    const inactive = recentCampaigns.filter(c => !c.is_active).length;

    console.log('📈 Durum Özeti:');
    console.log(`   ✅ Onaylı (is_approved=true): ${approved}`);
    console.log(`   ⏳ Onaysız (is_approved=false): ${notApproved}`);
    console.log(`   🔒 Pasif (is_active=false): ${inactive}\n`);

    console.log('📋 Detaylı Liste:\n');
    console.log('─'.repeat(120));
    console.log(
        'ID'.padEnd(8) +
        'Onaylı'.padEnd(10) +
        'Aktif'.padEnd(10) +
        'Banka'.padEnd(20) +
        'Kart'.padEnd(20) +
        'Başlık'.padEnd(50)
    );
    console.log('─'.repeat(120));

    recentCampaigns.forEach(c => {
        const approvedIcon = c.is_approved ? '✅' : '❌';
        const activeIcon = c.is_active ? '✅' : '🔒';
        const title = (c.title || 'Başlık yok').substring(0, 47) + '...';

        console.log(
            String(c.id).padEnd(8) +
            approvedIcon.padEnd(10) +
            activeIcon.padEnd(10) +
            (c.bank || '').substring(0, 17).padEnd(20) +
            (c.card_name || '').substring(0, 17).padEnd(20) +
            title
        );
    });

    console.log('─'.repeat(120));
    console.log('\n💡 Not: Anasayfada sadece is_approved=true olan kampanyalar görünür!');
    console.log('💡 Admin panelinden kampanyaları onaylayabilirsiniz.\n');

    // Show campaigns that are NOT approved
    const unapprovedCampaigns = recentCampaigns.filter(c => !c.is_approved);
    if (unapprovedCampaigns.length > 0) {
        console.log(`\n⚠️  ${unapprovedCampaigns.length} kampanya henüz onaylanmamış:`);
        unapprovedCampaigns.forEach(c => {
            console.log(`   - ID ${c.id}: ${(c.title || 'Başlık yok').substring(0, 60)}`);
        });
    }
}

checkRecentCampaigns().catch(console.error);
