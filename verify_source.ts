import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function verifySource() {
    // Get all campaigns from today
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, created_at')
        .eq('bank', 'İş Bankası')
        .eq('card_name', 'Maximum')
        .gte('created_at', '2025-12-31T00:00:00Z')
        .order('created_at', { ascending: true });

    console.log('\n📊 Bugün Eklenen Maximum Kampanyaları:\n');
    
    const groups: any = {};
    campaigns?.forEach((c: any) => {
        const time = new Date(c.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        if (!groups[time]) groups[time] = [];
        groups[time].push(c);
    });

    Object.entries(groups).forEach(([time, camps]: [string, any]) => {
        console.log(`\n⏰ Saat ${time} (${camps.length} kampanya):`);
        camps.forEach((c: any) => {
            console.log(`   - ID ${c.id}: ${c.title.substring(0, 50)}`);
        });
    });

    console.log('\n\n📝 Analiz:');
    console.log('- GitHub Actions genelde toplu import yapar (aynı saniyede çok kampanya)');
    console.log('- PC import her kampanya için 1.5s bekler (dağınık zamanlar)');
    console.log('\nID 15851 hangi grupta? Ona bakarak kaynağı anlayabiliriz.');
}

verifySource();
