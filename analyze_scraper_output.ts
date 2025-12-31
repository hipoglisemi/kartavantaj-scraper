import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('/Users/hipoglisemi/Desktop/final/İŞ BANKASI/maximum_kampanyalar_hibrit.json', 'utf8'));

console.log('\n📊 SCRAPER SONUÇLARI:\n');
console.log(`Toplam Kampanya: ${data.length}`);

let withImage = 0;
let withMinSpend = 0;
let withMaxDiscount = 0;
let withEarning = 0;
let withCards = 0;

data.forEach((c: any) => {
    if (c.image) withImage++;
    if (c.min_spend > 0) withMinSpend++;
    if (c.max_discount > 0) withMaxDiscount++;
    if (c.earning) withEarning++;
    if (c.eligible_customers && c.eligible_customers.length > 0) withCards++;
});

console.log(`\n✅ Veri Kalitesi:`);
console.log(`   Görselli: ${withImage}/${data.length} (${(withImage/data.length*100).toFixed(0)}%)`);
console.log(`   Min Spend: ${withMinSpend}/${data.length} (${(withMinSpend/data.length*100).toFixed(0)}%)`);
console.log(`   Max Discount: ${withMaxDiscount}/${data.length} (${(withMaxDiscount/data.length*100).toFixed(0)}%)`);
console.log(`   Earning: ${withEarning}/${data.length} (${(withEarning/data.length*100).toFixed(0)}%)`);
console.log(`   Cards: ${withCards}/${data.length} (${(withCards/data.length*100).toFixed(0)}%)`);

console.log(`\n📋 İlk 3 Kampanya:\n`);
data.slice(0, 3).forEach((c: any, i: number) => {
    console.log(`${i+1}. ${c.title}`);
    console.log(`   Görsel: ${c.image ? '✅' : '❌'}`);
    console.log(`   Min Spend: ${c.min_spend || 'YOK'}`);
    console.log(`   Earning: ${c.earning || 'YOK'}`);
    console.log(`   Cards: ${c.eligible_customers?.length || 0}\n`);
});

if (data.length >= 20) {
    console.log('✅ SONUÇ: Yeterli kampanya çekildi, import için hazır!');
} else {
    console.log('⚠️  UYARI: Az kampanya çekildi, bot koruması çok aktif olabilir.');
}
