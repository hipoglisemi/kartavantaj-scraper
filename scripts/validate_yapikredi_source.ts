import { supabase } from '../src/utils/supabase';
import puppeteer from 'puppeteer';

interface ValidationResult {
    id: number;
    title: string;
    card_name: string;
    url: string;
    current_min_spend: number;
    current_max_discount: number;
    current_earning: string;
    current_discount_percentage: number | null;
    campaign_text: string;
    issues: string[];
    suggested_min_spend?: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

async function extractCampaignText(url: string, browser: any): Promise<string> {
    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        // Extract main campaign text
        const text = await page.evaluate(() => {
            // Remove scripts, styles
            const scripts = document.querySelectorAll('script, style, nav, header, footer');
            scripts.forEach(s => s.remove());

            return document.body.innerText;
        });

        await page.close();
        return text;
    } catch (error) {
        console.error(`   ❌ URL çekilemedi: ${error.message}`);
        return '';
    }
}

function analyzeMinSpend(campaign: any, text: string): ValidationResult {
    const result: ValidationResult = {
        id: campaign.id,
        title: campaign.title,
        card_name: campaign.card_name,
        url: campaign.url,
        current_min_spend: campaign.min_spend,
        current_max_discount: campaign.max_discount,
        current_earning: campaign.earning,
        current_discount_percentage: campaign.discount_percentage,
        campaign_text: text.substring(0, 500), // First 500 chars
        issues: [],
        confidence: 'HIGH'
    };

    const textLower = text.toLowerCase();
    const titleLower = campaign.title.toLowerCase();

    // PATTERN 1: Percentage campaigns
    if (campaign.discount_percentage && campaign.max_discount) {
        const expectedMinSpend = Math.round(campaign.max_discount / (campaign.discount_percentage / 100));

        if (Math.abs(campaign.min_spend - expectedMinSpend) > expectedMinSpend * 0.1) {
            result.issues.push(`Yüzde kampanyası: %${campaign.discount_percentage} ile ${campaign.max_discount} TL kazanmak için ${expectedMinSpend} TL harcama gerekli (mevcut: ${campaign.min_spend})`);
            result.suggested_min_spend = expectedMinSpend;
            result.confidence = 'HIGH';
        }
    }

    // PATTERN 2: Tiered campaigns (Her X TL'ye Y TL, toplam Z TL)
    const tieredPattern = /her\s+(\d+(?:\.\d+)?)\s*tl.*?(\d+(?:\.\d+)?)\s*tl.*?toplam.*?(\d+(?:\.\d+)?)\s*tl/i;
    const tieredMatch = textLower.match(tieredPattern) || titleLower.match(tieredPattern);

    if (tieredMatch) {
        const perSpend = parseFloat(tieredMatch[1].replace('.', ''));
        const perReward = parseFloat(tieredMatch[2].replace('.', ''));
        const totalReward = parseFloat(tieredMatch[3].replace('.', ''));

        const expectedMinSpend = Math.round((totalReward / perReward) * perSpend);

        if (Math.abs(campaign.min_spend - expectedMinSpend) > 100) {
            result.issues.push(`Katlanan kampanya: Her ${perSpend} TL'ye ${perReward} TL, toplam ${totalReward} TL → min_spend ${expectedMinSpend} olmalı (mevcut: ${campaign.min_spend})`);
            result.suggested_min_spend = expectedMinSpend;
            result.confidence = 'HIGH';
        }
    }

    // PATTERN 3: Explicit min_spend in text
    const minSpendPatterns = [
        /(?:en az|minimum|min\.?)\s+(\d+(?:\.\d+)?)\s*tl/i,
        /(\d+(?:\.\d+)?)\s*tl\s+(?:ve üzeri|üzeri|ve üstü)/i,
        /(\d+(?:\.\d+)?)\s*tl'?(?:ye|lik|lık)\s+(?:harcama|alışveriş)/i
    ];

    for (const pattern of minSpendPatterns) {
        const match = textLower.match(pattern);
        if (match) {
            const textMinSpend = parseFloat(match[1].replace('.', ''));

            // Check if this is the per-transaction amount in tiered campaign
            if (!tieredMatch && Math.abs(campaign.min_spend - textMinSpend) > textMinSpend * 0.1) {
                result.issues.push(`Metinde "${match[0]}" yazıyor ama min_spend: ${campaign.min_spend}`);
                result.suggested_min_spend = textMinSpend;
                result.confidence = 'MEDIUM';
            }
            break;
        }
    }

    // PATTERN 4: Range campaigns (X TL - Y TL arası)
    const rangePattern = /(\d+(?:\.\d+)?)\s*tl\s*-\s*(\d+(?:\.\d+)?)\s*tl\s+arası/i;
    const rangeMatch = textLower.match(rangePattern) || titleLower.match(rangePattern);

    if (rangeMatch) {
        const minAmount = parseFloat(rangeMatch[1].replace('.', ''));
        const maxAmount = parseFloat(rangeMatch[2].replace('.', ''));

        // min_spend should be MINIMUM, not maximum
        if (campaign.min_spend > minAmount + 100) {
            result.issues.push(`Aralık kampanyası: ${minAmount} TL - ${maxAmount} TL arası → min_spend ${minAmount} olmalı (${maxAmount} değil!). Mevcut: ${campaign.min_spend}`);
            result.suggested_min_spend = minAmount;
            result.confidence = 'HIGH';
        }
    }

    // PATTERN 5: No minimum mentioned but has max_discount
    if (campaign.max_discount > 100 && campaign.min_spend === 0) {
        const noMinPatterns = [
            /minimum\s+(?:harcama\s+)?yok/i,
            /harcama\s+(?:şartı|koşulu)\s+yok/i,
            /tüm\s+harcamalarda/i
        ];

        const hasNoMinMention = noMinPatterns.some(p => textLower.match(p));

        if (!hasNoMinMention && !titleLower.includes('hediye') && !titleLower.includes('sigorta')) {
            result.issues.push(`max_discount ${campaign.max_discount} TL ama min_spend: 0. Metinde minimum harcama belirtilmemiş olabilir.`);
            result.confidence = 'LOW';
        }
    }

    return result;
}

async function validateAllYapiKredi() {
    console.log('🔍 Yapı Kredi Kampanyaları - Kaynak Metin Karşılaştırması\n');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'Yapı Kredi')
        .eq('is_active', true)
        .order('id', { ascending: false });

    if (error || !campaigns) {
        console.error('❌ Kampanyalar çekilemedi:', error);
        return;
    }

    console.log(`📊 Toplam ${campaigns.length} kampanya analiz edilecek\n`);
    console.log('⏳ Kampanya metinleri çekiliyor (bu biraz zaman alabilir)...\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results: ValidationResult[] = [];
    let processedCount = 0;

    for (const campaign of campaigns) {
        processedCount++;

        if (processedCount % 10 === 0) {
            console.log(`   ⏳ ${processedCount}/${campaigns.length} kampanya işlendi...`);
        }

        const text = await extractCampaignText(campaign.url, browser);
        const result = analyzeMinSpend(campaign, text);

        if (result.issues.length > 0) {
            results.push(result);
        }
    }

    await browser.close();

    console.log('\n' + '═'.repeat(80));
    console.log('📊 SONUÇLAR');
    console.log('═'.repeat(80));
    console.log(`\nToplam Sorun: ${results.length}\n`);

    // Group by confidence
    const highConfidence = results.filter(r => r.confidence === 'HIGH');
    const mediumConfidence = results.filter(r => r.confidence === 'MEDIUM');
    const lowConfidence = results.filter(r => r.confidence === 'LOW');

    console.log(`🔴 Yüksek Güven (${highConfidence.length}): Kesin hata, düzeltilmeli`);
    console.log(`🟡 Orta Güven (${mediumConfidence.length}): Kontrol edilmeli`);
    console.log(`🔵 Düşük Güven (${lowConfidence.length}): İncelenmeli\n`);

    // Show HIGH confidence issues
    if (highConfidence.length > 0) {
        console.log('═'.repeat(80));
        console.log('🔴 YÜKSEK GÜVEN SORUNLAR (İlk 20)');
        console.log('═'.repeat(80));

        for (let i = 0; i < Math.min(20, highConfidence.length); i++) {
            const r = highConfidence[i];
            console.log(`\n${i + 1}. ID ${r.id} | ${r.card_name}`);
            console.log(`   Başlık: ${r.title.substring(0, 70)}${r.title.length > 70 ? '...' : ''}`);
            console.log(`   URL: ${r.url}`);
            console.log(`   Mevcut: min_spend=${r.current_min_spend}, max_discount=${r.current_max_discount}`);
            console.log(`            earning="${r.current_earning}"`);
            if (r.suggested_min_spend) {
                console.log(`   Önerilen: min_spend=${r.suggested_min_spend}`);
            }
            console.log(`   Sorunlar:`);
            r.issues.forEach(issue => console.log(`      - ${issue}`));
        }

        if (highConfidence.length > 20) {
            console.log(`\n   ... ve ${highConfidence.length - 20} sorun daha`);
        }
    }

    // Show MEDIUM confidence issues
    if (mediumConfidence.length > 0) {
        console.log('\n' + '═'.repeat(80));
        console.log('🟡 ORTA GÜVEN SORUNLAR (İlk 10)');
        console.log('═'.repeat(80));

        for (let i = 0; i < Math.min(10, mediumConfidence.length); i++) {
            const r = mediumConfidence[i];
            console.log(`\n${i + 1}. ID ${r.id} | ${r.card_name}`);
            console.log(`   Başlık: ${r.title.substring(0, 70)}${r.title.length > 70 ? '...' : ''}`);
            console.log(`   Sorunlar: ${r.issues.join(' | ')}`);
        }
    }

    // Export to JSON
    const jsonOutput = {
        summary: {
            total_campaigns: campaigns.length,
            total_issues: results.length,
            high_confidence: highConfidence.length,
            medium_confidence: mediumConfidence.length,
            low_confidence: lowConfidence.length
        },
        high_confidence_issues: highConfidence,
        medium_confidence_issues: mediumConfidence,
        low_confidence_issues: lowConfidence
    };

    const fs = require('fs');
    fs.writeFileSync(
        'yapikredi_validation_results.json',
        JSON.stringify(jsonOutput, null, 2)
    );

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Analiz tamamlandı!');
    console.log('═'.repeat(80));
    console.log(`\n📄 Detaylı sonuçlar: yapikredi_validation_results.json`);
    console.log(`   Toplam ${results.length} sorun tespit edildi.\n`);
}

validateAllYapiKredi()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
