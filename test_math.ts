import { extractMathDetails } from './src/utils/dataExtractor';

const cases = [
    { title: "1000 TL ve üzeri alışverişe 150 TL puan", content: "1000 TL ve üzeri alışverişe 150 TL puan kazanın." },
    { title: "500 TL'ye varan chip-para", content: "500 TL'ye varan chip-para fırsatını kaçırmayın." },
    { title: "Her 1000 TL'ye 100 TL puan", content: "Kampanya kapsamında her 1000 TL'ye 100 TL puan verilecektir." },
    { title: "%10 indirim (max 200 TL)", content: "%10 indirim (max 200 TL) kampanyası başladı." },
    { title: "300 TL ve üzeri harcamaya 3 taksit", content: "300 TL ve üzeri harcamaya 3 taksit imkanı." },
    { title: "Fatura talimatına 100 TL chip-para", content: "Otomatik fatura talimatı verin 100 TL chip-para kazanın." },
    { title: "Her 1000 TL'ye 100 TL puan, toplam 500 TL", content: "Müşteriler her 1000 TL'ye 100 TL puan kazanacaktır, kampanya boyuna toplam 500 TL kazanılabilir." }
];

console.log('--- Phase 8 Deterministic Math Extraction Results ---\n');

cases.forEach((c, i) => {
    const math = extractMathDetails(c.title, c.content);

    console.log(`${i + 1}. Text: "${c.title}"`);
    console.log(`   min_spend:   ${math.min_spend}`);
    console.log(`   earning:     ${math.earning}`);
    console.log(`   discount:    ${math.discount}`);
    console.log(`   max:         ${math.max_discount}`);
    console.log(`   % :          ${math.discount_percentage}`);
    console.log(`   req_spend:   ${math.required_spend_for_max_benefit}`);
    console.log(`   flags:       [${math.math_flags.join(', ')}]`);
    console.log('---');
});
