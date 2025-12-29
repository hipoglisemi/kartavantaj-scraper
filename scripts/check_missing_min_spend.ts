import { supabase } from '../src/utils/supabase';

/**
 * Check for campaigns with earning but no min_spend
 * (excluding taksit, percentage, and special campaigns)
 */

async function checkMissingMinSpend() {
    console.log('🔍 min_spend eksik kampanyaları arıyorum...\n');

    // First check ID 14756
    console.log('═'.repeat(60));
    console.log('ID 14756 Kontrolü');
    console.log('═'.repeat(60));

    const { data: c1 } = await supabase
        .from('campaigns')
        .select('id, title, earning, discount, min_spend, max_discount, description')
        .eq('id', 14756)
        .single();

    if (c1) {
        console.log(`\nID ${c1.id}: ${c1.title}`);
        console.log(`Earning: ${c1.earning}`);
        console.log(`Discount: ${c1.discount || 'YOK'}`);
        console.log(`Min Spend: ${c1.min_spend || 'YOK'}`);
        console.log(`Max Discount: ${c1.max_discount || 'YOK'}`);
        console.log(`Açıklama: ${c1.description?.substring(0, 150)}`);
    }

    // Find similar campaigns: has earning/max_discount but no min_spend
    console.log('\n' + '═'.repeat(60));
    console.log('Benzer Kampanyalar (earning var, min_spend yok)');
    console.log('═'.repeat(60));

    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, earning, discount, min_spend, max_discount, description')
        .is('min_spend', null)
        .not('max_discount', 'is', null)
        .order('id', { ascending: false })
        .limit(50);

    if (!campaigns || campaigns.length === 0) {
        console.log('\n✅ min_spend eksik kampanya yok!\n');
        return;
    }

    // Filter out taksit and percentage campaigns
    const issues = campaigns.filter(c => {
        const earning = c.earning?.toLowerCase() || '';
        const discount = c.discount?.toLowerCase() || '';

        // Skip taksit campaigns
        if (earning.includes('taksit') || discount.includes('taksit')) return false;

        // Skip percentage campaigns
        if (earning.includes('%')) return false;

        // Skip special campaigns (no numeric earning)
        if (!c.earning || !c.earning.match(/\d+/)) return false;

        return true;
    });

    console.log(`\n❌ ${issues.length} kampanyada min_spend eksik:\n`);

    issues.forEach((c, idx) => {
        console.log(`${idx + 1}. ID ${c.id}: ${c.title.substring(0, 60)}`);
        console.log(`   Earning: ${c.earning}`);
        console.log(`   Max Discount: ${c.max_discount}`);
        console.log(`   Açıklama: ${c.description?.substring(0, 100) || 'YOK'}`);

        // Try to extract min_spend from description
        const desc = (c.title + ' ' + (c.description || '')).toLowerCase();
        const patterns = [
            /(\d+(?:\.\d+)?)\s*tl\s*(?:ve\s*üzeri|üzerinde|üstü)/i,
            /minimum\s*(\d+(?:\.\d+)?)\s*tl/i,
            /en\s*az\s*(\d+(?:\.\d+)?)\s*tl/i,
        ];

        for (const pattern of patterns) {
            const match = desc.match(pattern);
            if (match) {
                const amount = parseFloat(match[1].replace(/\./g, ''));
                console.log(`   💡 Tespit: ${amount} TL min_spend olabilir`);
                break;
            }
        }
        console.log('');
    });

    console.log('═'.repeat(60));
    console.log(`📊 TOPLAM: ${issues.length} kampanya`);
    console.log('═'.repeat(60));
}

checkMissingMinSpend()
    .then(() => {
        console.log('\n✨ Kontrol tamamlandı.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
