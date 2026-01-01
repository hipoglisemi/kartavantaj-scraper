import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function analyze() {
    // 1. Tüm başlıkları çek
    const { data } = await supabase.from('campaigns').select('id, title');
    
    if (!data) return;

    console.log(`\n🔍 ${data.length} Kampanya Başlığı Analiz Ediliyor...\n`);

    const patterns: any = {
        'TL Puan / Chip-para': { count: 0, examples: [] },
        'Yüzde İndirim (%X)': { count: 0, examples: [] },
        'Taksit (Taksit / Vade Farksız)': { count: 0, examples: [] },
        'TL İndirim (Net Tutar)': { count: 0, examples: [] },
        'Varan Puan (Varan)': { count: 0, examples: [] },
        'Diğer / Özel': { count: 0, examples: [] }
    };

    data.forEach(c => {
        const t = c.title.toLowerCase();
        
        if (t.includes('varan') && (t.includes('puan') || t.includes('chip'))) {
            patterns['Varan Puan (Varan)'].count++;
            if (patterns['Varan Puan (Varan)'].examples.length < 3) patterns['Varan Puan (Varan)'].examples.push(c.title);
        }
        else if (t.includes('taksit') || t.includes('vade') || t.includes('öteleme')) {
            patterns['Taksit (Taksit / Vade Farksız)'].count++;
            if (patterns['Taksit (Taksit / Vade Farksız)'].examples.length < 3) patterns['Taksit (Taksit / Vade Farksız)'].examples.push(c.title);
        }
        else if (t.includes(' tl ') && (t.includes('puan') || t.includes('chip') || t.includes('bonus'))) {
            patterns['TL Puan / Chip-para'].count++;
            if (patterns['TL Puan / Chip-para'].examples.length < 3) patterns['TL Puan / Chip-para'].examples.push(c.title);
        }
        else if (t.includes('%') || t.includes('yüzde')) {
            patterns['Yüzde İndirim (%X)'].count++;
            if (patterns['Yüzde İndirim (%X)'].examples.length < 3) patterns['Yüzde İndirim (%X)'].examples.push(c.title);
        }
        else if (t.includes(' tl ') && t.includes('indirim')) {
            patterns['TL İndirim (Net Tutar)'].count++;
            if (patterns['TL İndirim (Net Tutar)'].examples.length < 3) patterns['TL İndirim (Net Tutar)'].examples.push(c.title);
        }
        else {
            patterns['Diğer / Özel'].count++;
            if (patterns['Diğer / Özel'].examples.length < 3) patterns['Diğer / Özel'].examples.push(c.title);
        }
    });

    // Sonuçları Yazdır
    Object.keys(patterns).forEach(key => {
        const p = patterns[key];
        console.log(`📌 ${key}`);
        console.log(`   Adet: ${p.count} (${((p.count / data.length) * 100).toFixed(1)}%)`);
        console.log(`   Örnekler:`);
        p.examples.forEach((ex: string) => console.log(`   - ${ex}`));
        console.log('');
    });
}

analyze();
