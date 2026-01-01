import * as fs from 'fs';

// Check what was sent to AI for campaign 16140
const rawData = JSON.parse(fs.readFileSync('vakifbank_kampanyalar_raw.json', 'utf-8'));
const campaign = rawData.find((c: any) => c.url.includes('39505'));

if (!campaign) {
    console.log('❌ Kampanya bulunamadı');
    process.exit(1);
}

console.log('\n🔍 AI Parser\'a Gönderilen Input Analizi\n');
console.log('='.repeat(60));

console.log('\n📋 Kampanya Başlığı:');
console.log(campaign.title);

console.log('\n📄 HTML İçeriği (AI\'ye gönderilen):');
console.log('='.repeat(60));
console.log(campaign.detail_html);
console.log('='.repeat(60));

console.log('\n🔍 Kritik Kelimeler:');
const html = campaign.detail_html;

// Check for "puan" mentions
const puanMatches = html.match(/puan/gi) || [];
console.log(`\n   "puan" kelimesi: ${puanMatches.length} kez geçiyor`);
if (puanMatches.length > 0) {
    console.log(`   ⚠️  AI "puan" kelimesini görmüş olabilir`);
}

// Check for "indirim" mentions
const indirimMatches = html.match(/indirim/gi) || [];
console.log(`\n   "indirim" kelimesi: ${indirimMatches.length} kez geçiyor`);
if (indirimMatches.length > 0) {
    console.log(`   ✅ "indirim" açıkça belirtilmiş`);
}

// Check for "ekstre" mentions
const ekstreMatches = html.match(/ekstre/gi) || [];
console.log(`\n   "ekstre" kelimesi: ${ekstreMatches.length} kez geçiyor`);
if (ekstreMatches.length > 0) {
    console.log(`   ✅ "ekstre" açıkça belirtilmiş`);
}

// Check for "worldpuan" mentions
const worldpuanMatches = html.match(/worldpuan/gi) || [];
console.log(`\n   "worldpuan" kelimesi: ${worldpuanMatches.length} kez geçiyor`);

console.log('\n\n📊 Analiz Sonucu:');
console.log('='.repeat(60));

if (puanMatches.length === 0 && indirimMatches.length > 0) {
    console.log('✅ HTML\'de "puan" YOK, "indirim" VAR');
    console.log('❌ AI yanlış parse etmiş - input doğruydu!');
    console.log('\n🔍 Olası Sebepler:');
    console.log('   1. AI diğer Vakıfbank kampanyalarından pattern öğrenmiş');
    console.log('   2. "Worldpuan" kelimesi AI\'yi yanıltmış olabilir');
    console.log('   3. AI prompt\'unda "puan" ve "indirim" ayrımı net değil');
} else if (puanMatches.length > 0) {
    console.log('⚠️  HTML\'de "puan" kelimesi var!');
    console.log('   AI bu kelimeyi görerek yanılmış olabilir');
} else {
    console.log('🤔 Beklenmeyen durum');
}

// Check the combined input that goes to AI
console.log('\n\n📤 AI\'ye Gönderilen Tam Input:');
console.log('='.repeat(60));
const aiInput = `${campaign.title}\n${campaign.detail_html}`;
console.log(`Toplam karakter: ${aiInput.length}`);
console.log(`\nİlk 500 karakter:`);
console.log(aiInput.substring(0, 500));
