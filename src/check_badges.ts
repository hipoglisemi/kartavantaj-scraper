import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkBadges() {
    console.log('🔍 Badge Kolonlarını İnceliyorum...\n');

    // Badge'i OLAN kampanyalar
    const { data: withBadges } = await supabase
        .from('campaigns')
        .select('id, title, badge_text, badge_color, earning, discount, ai_enhanced, created_at')
        .not('badge_text', 'is', null)
        .order('id', { ascending: false })
        .limit(5);

    console.log('✅ Badge\'i OLAN 5 kampanya:');
    console.log('─'.repeat(80));
    withBadges?.forEach(c => {
        console.log(`\nID: ${c.id}`);
        console.log(`Title: ${c.title}`);
        console.log(`Badge: ${c.badge_text} (${c.badge_color})`);
        console.log(`Earning: ${c.earning || 'N/A'}`);
        console.log(`Discount: ${c.discount || 'N/A'}`);
        console.log(`AI Enhanced: ${c.ai_enhanced}`);
        console.log(`Created: ${c.created_at}`);
    });

    // Badge'i OLMAYAN kampanyalar
    const { data: withoutBadges } = await supabase
        .from('campaigns')
        .select('id, title, badge_text, badge_color, earning, discount, ai_enhanced, created_at')
        .is('badge_text', null)
        .order('id', { ascending: false })
        .limit(5);

    console.log('\n\n❌ Badge\'i OLMAYAN 5 kampanya:');
    console.log('─'.repeat(80));
    withoutBadges?.forEach(c => {
        console.log(`\nID: ${c.id}`);
        console.log(`Title: ${c.title}`);
        console.log(`Badge: NULL`);
        console.log(`Earning: ${c.earning || 'N/A'}`);
        console.log(`Discount: ${c.discount || 'N/A'}`);
        console.log(`AI Enhanced: ${c.ai_enhanced}`);
        console.log(`Created: ${c.created_at}`);
    });

    // İstatistik
    const { count: totalCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

    const { count: withBadgeCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .not('badge_text', 'is', null);

    console.log('\n\n📊 İstatistik:');
    console.log('─'.repeat(80));
    console.log(`Toplam Kampanya: ${totalCount}`);
    console.log(`Badge'i Olan: ${withBadgeCount}`);
    console.log(`Badge'i Olmayan: ${(totalCount || 0) - (withBadgeCount || 0)}`);
    console.log(`Oran: ${((withBadgeCount || 0) / (totalCount || 1) * 100).toFixed(1)}%`);
}

checkBadges();
