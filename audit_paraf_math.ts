
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function auditMath() {
    console.log('\n🧮 Paraf Matematiksel Bütünlük Kontrolü...\n');

    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, min_spend, earning, max_discount, description')
        .eq('bank', 'Halkbank')
        .order('id', { ascending: false });

    if (!campaigns || campaigns.length === 0) {
        console.log('❌ Kampanya bulunamadı.');
        return;
    }

    let suspicious = 0;
    let total = campaigns.length;

    console.log(`Toplam ${total} kampanya inceleniyor...\n`);

    for (const c of campaigns) {
        let isSuspicious = false;
        let reason = [];

        const titleLower = c.title.toLowerCase();
        const earnLower = (c.earning || '').toLowerCase();

        // 1. Min Spend Check (Zero check for non-informational campaigns)
        // If title contains money ("1000 TL") but min_spend is 0
        const moneyInTitle = titleLower.match(/(\d+[\d\.]*)\s*tl/);
        const hasSpendKeyword = titleLower.includes('harcama') || titleLower.includes('alışveriş');

        if (c.min_spend === 0 && moneyInTitle && hasSpendKeyword) {
            // Exclude pure discount campaigns if necessary, but usually spend is required
            if (!titleLower.includes('indirim') && !titleLower.includes('taksit')) {
                isSuspicious = true;
                reason.push('Harcama gerektirebilir ama min_spend: 0');
            }
        }

        // 2. "Varan" (Up to) Consistency
        // If title says "1000 TL'ye varan", earning should probably be max 1000
        if (titleLower.includes('varan')) {
            if (moneyInTitle) {
                const titleAmount = parseInt(moneyInTitle[1].replace(/\./g, ''));
                // Check if earning matches
                const earningMatch = earnLower.match(/(\d+[\d\.]*)/);
                if (earningMatch) {
                    const earnAmount = parseInt(earningMatch[1].replace(/\./g, ''));
                    if (earnAmount !== titleAmount) {
                        // Sometimes earning is text like "%10"
                        if (!c.earning.includes('%')) {
                            isSuspicious = true;
                            reason.push(`Varan tutarı uyumsuz: Başlık(${titleAmount}) vs Earning(${earnAmount})`);
                        }
                    }
                }
            }
        }

        // 3. Percentage Calculation Logic
        // If earning is % and max_discount exists, check if min_spend is mathematically roughly consistent
        // min_spend ~= max_discount / percentage
        if (c.earning && c.earning.includes('%') && c.max_discount > 0) {
            const percMatch = c.earning.match(/%(\d+)/);
            if (percMatch) {
                const perc = parseInt(percMatch[1]);
                const expectedSpend = (c.max_discount * 100) / perc;

                // Allow some variance or if min_spend is explicitly stated differently
                if (c.min_spend > 0) {
                    const ratio = c.min_spend / expectedSpend;
                    if (ratio < 0.9 || ratio > 1.1) {
                        // This might not be an error if the campaign has a specific limit cap different from math
                        // But worth flagging for review
                        // isSuspicious = true; 
                        // reason.push(`Yüzde hesabı şüpheli: %${perc}, Max ${c.max_discount} -> Beklenen Harcama ${expectedSpend}, Girilen ${c.min_spend}`);
                    }
                }
            }
        }

        // 4. Earning Format Check
        if (c.earning && !c.earning.includes('TL') && !c.earning.includes('%') && !c.earning.includes('Mil') && c.earning.length < 5) {
            isSuspicious = true;
            reason.push(`Earning formatı bozuk olabilir: "${c.earning}"`);
        }

        if (isSuspicious) {
            suspicious++;
            console.log(`🚩 [ID:${c.id}] ${c.title.substring(0, 50)}...`);
            console.log(`      💰 Spend: ${c.min_spend} | Earn: ${c.earning} | MaxDisc: ${c.max_discount}`);
            console.log(`      ❓ Sebep: ${reason.join(', ')}`);
            console.log('---');
        }
    }

    console.log(`\n📊 Sonuç: ${total} kampanyadan ${suspicious} tanesi şüpheli bulundu (%${((suspicious / total) * 100).toFixed(1)}).`);
}

auditMath();
