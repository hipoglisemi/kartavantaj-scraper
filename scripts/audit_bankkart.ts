import { supabase } from './src/utils/supabase';

(async () => {
    console.log('=== TÜM BANKKART KAMPANYALARI - DETAYLI HATA ANALİZİ ===\n');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, url, min_spend, earning, max_discount, discount_percentage, description')
        .eq('card_id', 'ziraat-bankkart')
        .eq('is_active', true)
        .order('id', { ascending: true });

    if (error) {
        console.error('Hata:', error);
        return;
    }

    console.log(`Toplam Kampanya: ${data?.length || 0}\n`);
    console.log('='.repeat(80));

    let errorCount = 0;
    const errorTypes = {
        percentage_wrong_earning: [],
        missing_min_spend: [],
        illogical_values: [],
        installment_issues: [],
        other: []
    };

    data?.forEach((c, i) => {
        const errors = [];

        // 1. Yüzde bazlı kampanyalarda earning formatı yanlış
        if (c.discount_percentage && c.earning && !c.earning.includes('%')) {
            errors.push('❌ YÜZDE HATASI: discount_percentage=' + c.discount_percentage + ' ama earning="' + c.earning + '" (% içermiyor)');
            errorTypes.percentage_wrong_earning.push(c.id);
        }

        // 2. Yüzde bazlı kampanyalarda min_spend eksik
        if (c.discount_percentage && c.max_discount && !c.min_spend) {
            errors.push('❌ MIN_SPEND EKSIK: Yüzde bazlı kampanya ama min_spend null (olması gereken: ' + (c.max_discount / (c.discount_percentage / 100)) + ')');
            errorTypes.missing_min_spend.push(c.id);
        }

        // 3. Mantıksız değerler (earning > min_spend)
        if (c.min_spend && c.max_discount && c.max_discount > c.min_spend) {
            errors.push('❌ MANTIK HATASI: max_discount (' + c.max_discount + ') > min_spend (' + c.min_spend + ')');
            errorTypes.illogical_values.push(c.id);
        }

        // 4. Taksit kampanyalarında min_spend var mı kontrol
        if (c.earning && c.earning.indexOf('Taksit') !== -1 && !c.min_spend) {
            errors.push('⚠️  TAKSİT: min_spend yok (bazı taksit kampanyalarında normal olabilir)');
            errorTypes.installment_issues.push(c.id);
        }

        // 5. Earning null veya boş
        if (!c.earning || c.earning.trim() === '') {
            errors.push('❌ EARNING BOŞ: earning null veya boş');
            errorTypes.other.push(c.id);
        }

        if (errors.length > 0) {
            errorCount++;
            console.log(`\n[${i + 1}] ID: ${c.id}`);
            console.log(`Başlık: ${c.title}`);
            console.log(`URL: ${c.url?.substring(0, 70)}...`);
            console.log(`Veriler:`);
            console.log(`  - min_spend: ${c.min_spend || 'YOK'}`);
            console.log(`  - earning: ${c.earning || 'YOK'}`);
            console.log(`  - max_discount: ${c.max_discount || 'YOK'}`);
            console.log(`  - discount_%: ${c.discount_percentage || 'YOK'}`);
            console.log(`\nHatalar:`);
            errors.forEach(e => console.log(`  ${e}`));
            console.log('='.repeat(80));
        }
    });

    console.log(`\n\n📊 ÖZET:`);
    console.log(`Toplam Kampanya: ${data?.length}`);
    console.log(`Hatalı Kampanya: ${errorCount}`);
    console.log(`Başarı Oranı: ${((1 - errorCount / (data?.length || 1)) * 100).toFixed(1)}%\n`);

    console.log(`HATA TİPLERİ:`);
    console.log(`  - Yüzde formatı yanlış: ${errorTypes.percentage_wrong_earning.length}`);
    console.log(`  - Min_spend eksik: ${errorTypes.missing_min_spend.length}`);
    console.log(`  - Mantıksız değerler: ${errorTypes.illogical_values.length}`);
    console.log(`  - Taksit sorunları: ${errorTypes.installment_issues.length}`);
    console.log(`  - Diğer: ${errorTypes.other.length}`);
})();
