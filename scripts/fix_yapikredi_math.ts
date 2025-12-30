import { supabase } from '../src/utils/supabase';

async function fixYapiKrediMath() {
    console.log('🔧 Yapı Kredi Matematik Hatalarını Düzeltiyoruz...\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'Yapı Kredi')
        .eq('is_active', true);

    if (error || !campaigns) {
        console.error('❌ Kampanyalar çekilemedi:', error);
        return;
    }

    console.log(`📊 Toplam ${campaigns.length} kampanya kontrol ediliyor\n`);

    const fixes: Array<{
        id: number;
        title: string;
        old_values: any;
        new_values: any;
        reason: string;
    }> = [];

    for (const c of campaigns) {
        const updates: any = {};
        let needsUpdate = false;
        const reasons: string[] = [];

        // FIX 1: Percentage campaigns with min_spend = 0 or incorrect
        if (c.discount_percentage && c.max_discount) {
            const calculatedMinSpend = Math.round(c.max_discount / (c.discount_percentage / 100));

            // Check if current min_spend is wrong
            if (!c.min_spend || c.min_spend === 0 ||
                Math.abs(c.min_spend - calculatedMinSpend) > calculatedMinSpend * 0.3) {
                updates.min_spend = calculatedMinSpend;
                needsUpdate = true;
                reasons.push(`min_spend: ${c.min_spend || 0} → ${calculatedMinSpend} (%${c.discount_percentage} ile ${c.max_discount} TL kazanmak için)`);
            }

            // FIX 2: Earning format for percentage campaigns
            const earning = c.earning?.toString() || '';
            if (!earning.includes('(max') && !earning.includes('maksimum')) {
                const correctEarning = `%${c.discount_percentage} (max ${c.max_discount}TL)`;
                updates.earning = correctEarning;
                needsUpdate = true;
                reasons.push(`earning: "${earning}" → "${correctEarning}"`);
            }
        }

        // FIX 3: Tiered campaigns (Her X TL'ye Y TL, toplam Z TL)
        const titleLower = c.title.toLowerCase();
        const tieredMatch = titleLower.match(/her\s+(\d+(?:\.\d+)?)\s*tl.*?(\d+(?:\.\d+)?)\s*tl.*?toplam.*?(\d+(?:\.\d+)?)\s*tl/i);

        if (tieredMatch) {
            const perSpend = parseFloat(tieredMatch[1].replace('.', ''));
            const perReward = parseFloat(tieredMatch[2].replace('.', ''));
            const totalReward = parseFloat(tieredMatch[3].replace('.', ''));

            const calculatedMinSpend = Math.round((totalReward / perReward) * perSpend);

            if (c.min_spend && Math.abs(c.min_spend - calculatedMinSpend) > 100) {
                updates.min_spend = calculatedMinSpend;
                needsUpdate = true;
                reasons.push(`min_spend: ${c.min_spend} → ${calculatedMinSpend} (katlanan kampanya)`);
            }

            // Check earning
            const earning = c.earning?.toString() || '';
            const earningMatch = earning.match(/(\d+(?:\.\d+)?)\s*TL/);
            if (earningMatch) {
                const earningAmount = parseFloat(earningMatch[1].replace('.', ''));
                if (Math.abs(earningAmount - totalReward) > 10) {
                    const correctEarning = earning.replace(/\d+(?:\.\d+)?\s*TL/, `${totalReward} TL`);
                    updates.earning = correctEarning;
                    needsUpdate = true;
                    reasons.push(`earning: "${earning}" → "${correctEarning}" (toplam kazanç)`);
                }
            }
        }

        if (needsUpdate) {
            fixes.push({
                id: c.id,
                title: c.title,
                old_values: {
                    min_spend: c.min_spend,
                    earning: c.earning,
                    max_discount: c.max_discount,
                    discount_percentage: c.discount_percentage
                },
                new_values: updates,
                reason: reasons.join(' | ')
            });
        }
    }

    console.log('═'.repeat(80));
    console.log('📋 DÜZELTME ÖNİZLEMESİ');
    console.log('═'.repeat(80));
    console.log(`\nToplam ${fixes.length} kampanya düzeltilecek\n`);

    // Show first 20 fixes
    for (let i = 0; i < Math.min(20, fixes.length); i++) {
        const fix = fixes[i];
        console.log(`${i + 1}. ID ${fix.id} | ${fix.title.substring(0, 60)}${fix.title.length > 60 ? '...' : ''}`);
        console.log(`   Değişiklikler: ${fix.reason}`);
        console.log('');
    }

    if (fixes.length > 20) {
        console.log(`... ve ${fixes.length - 20} kampanya daha\n`);
    }

    if (fixes.length === 0) {
        console.log('✅ Düzeltilecek kampanya yok!\n');
        return;
    }

    // Apply fixes
    console.log('═'.repeat(80));
    console.log('💾 Düzeltmeler uygulanıyor...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const fix of fixes) {
        const { error } = await supabase
            .from('campaigns')
            .update(fix.new_values)
            .eq('id', fix.id);

        if (error) {
            console.error(`❌ ID ${fix.id} düzeltilemedi:`, error.message);
            errorCount++;
        } else {
            successCount++;
            if (successCount <= 10) {
                console.log(`✅ ID ${fix.id} düzeltildi`);
            }
        }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Düzeltme tamamlandı!');
    console.log('═'.repeat(80));
    console.log(`Başarılı: ${successCount}`);
    console.log(`Hatalı: ${errorCount}`);
    console.log('═'.repeat(80));
}

fixYapiKrediMath()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
