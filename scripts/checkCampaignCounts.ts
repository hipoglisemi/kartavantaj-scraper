import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkCampaignCounts() {
    const today = new Date().toISOString().split('T')[0];

    console.log('📊 Kampanya Sayıları Analizi\n');
    console.log('='.repeat(60));

    // Total
    const { count: total } = await supabase.from('campaigns').select('*', { count: 'exact', head: true });
    console.log(`Toplam Kampanya: ${total}`);

    // is_approved
    const { count: approved } = await supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('is_approved', true);
    const { count: notApproved } = await supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('is_approved', false);
    const { count: nullApproved } = await supabase.from('campaigns').select('*', { count: 'exact', head: true }).is('is_approved', null);

    console.log(`\nis_approved = true: ${approved}`);
    console.log(`is_approved = false: ${notApproved}`);
    console.log(`is_approved = null: ${nullApproved}`);

    // is_active
    const { count: active } = await supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: inactive } = await supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('is_active', false);

    console.log(`\nis_active = true: ${active}`);
    console.log(`is_active = false: ${inactive}`);

    // Homepage criteria
    const { count: homepage } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true)
        .eq('is_active', true)
        .gte('valid_until', today);

    console.log(`\n🏠 Anasayfa Kriterleri (approved + active + valid): ${homepage}`);

    // Approved + Active (no date)
    const { count: approvedActive } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true)
        .eq('is_active', true);

    console.log(`Approved + Active (tarih filtresi yok): ${approvedActive}`);

    // Not approved but active
    const { count: notApprovedButActive } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false)
        .eq('is_active', true);

    console.log(`\n⚠️  Onaylanmamış ama Aktif: ${notApprovedButActive}`);

    // Expired
    const { count: expired } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .lt('valid_until', today);

    console.log(`📅 Süresi Dolmuş (valid_until < today): ${expired}`);

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 FARK ANALİZİ:`);
    console.log(`Admin Panel: ${total}`);
    console.log(`Anasayfa: ${homepage}`);
    console.log(`Fark: ${total! - homepage!} kampanya`);

    if (notApprovedButActive! > 0) {
        console.log(`\n💡 Muhtemel Sebep: ${notApprovedButActive} kampanya aktif ama onaylanmamış`);
    }
}

checkCampaignCounts().catch(console.error);
