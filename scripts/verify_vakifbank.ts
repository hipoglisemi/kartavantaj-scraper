import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function verifyVakifbankCampaigns() {
    console.log('\n🔍 Vakıfbank Kampanya Doğrulama Raporu\n');

    // Fetch all Vakıfbank campaigns
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'Vakıfbank')
        .order('id', { ascending: false });

    if (error) {
        console.error('❌ Hata:', error.message);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('⚠️  Vakıfbank kampanyası bulunamadı.');
        return;
    }

    console.log(`📊 Toplam ${campaigns.length} Vakıfbank kampanyası bulundu\n`);

    // Column population check
    const columns = [
        'id', 'title', 'description', 'url', 'reference_url', 'image',
        'bank', 'card_name', 'bank_id', 'card_id', 'sector_id', 'sector_slug',
        'min_spend', 'earning', 'max_discount', 'discount_rate', 'max_installments',
        'valid_from', 'valid_until', 'conditions', 'participation_method',
        'badge_text', 'badge_color', 'slug', 'is_active'
    ];

    console.log('📋 Kolon Doluluk Oranları:\n');
    const stats: any = {};

    columns.forEach(col => {
        const filled = campaigns.filter(c => c[col] !== null && c[col] !== undefined && c[col] !== '').length;
        const percentage = ((filled / campaigns.length) * 100).toFixed(1);
        stats[col] = { filled, total: campaigns.length, percentage };

        const emoji = parseFloat(percentage) === 100 ? '✅' : parseFloat(percentage) >= 80 ? '⚠️' : '❌';
        console.log(`   ${emoji} ${col.padEnd(25)} ${filled}/${campaigns.length} (${percentage}%)`);
    });

    // Mathematical calculations check
    console.log('\n\n🧮 Matematiksel Hesaplama Kontrolü:\n');

    campaigns.forEach((campaign, index) => {
        console.log(`\n[${index + 1}/${campaigns.length}] ${campaign.title}`);
        console.log(`   ID: ${campaign.id}`);
        console.log(`   URL: ${campaign.url || 'YOK'}`);
        console.log(`   Reference URL: ${campaign.reference_url || 'YOK'}`);
        console.log(`   Min Spend: ${campaign.min_spend || 0} TL`);
        console.log(`   Earning: ${campaign.earning || 'YOK'}`);
        console.log(`   Max Discount: ${campaign.max_discount || 0} TL`);
        console.log(`   Discount Rate: ${campaign.discount_rate || 'YOK'}`);
        console.log(`   Max Installments: ${campaign.max_installments || 'YOK'}`);
        console.log(`   Sector: ${campaign.sector_slug || 'YOK'}`);
        console.log(`   Badge: ${campaign.badge_text || 'YOK'}`);
        console.log(`   Participation: ${campaign.participation_method || 'YOK'}`);

        // Check for mathematical inconsistencies
        const warnings: string[] = [];

        if (campaign.min_spend && campaign.min_spend < 0) {
            warnings.push('⚠️  Min spend negatif!');
        }

        if (campaign.max_discount && campaign.max_discount < 0) {
            warnings.push('⚠️  Max discount negatif!');
        }

        if (campaign.max_discount && campaign.min_spend && campaign.max_discount > campaign.min_spend) {
            warnings.push('⚠️  Max discount, min spend\'den büyük!');
        }

        if (!campaign.url) {
            warnings.push('❌ URL eksik!');
        }

        if (!campaign.sector_slug) {
            warnings.push('⚠️  Sector slug eksik!');
        }

        if (warnings.length > 0) {
            console.log(`   🚨 UYARILAR:`);
            warnings.forEach(w => console.log(`      ${w}`));
        } else {
            console.log(`   ✅ Hesaplamalar doğru`);
        }
    });

    // Summary
    console.log('\n\n📊 ÖZET:\n');
    console.log(`   Toplam Kampanya: ${campaigns.length}`);
    console.log(`   URL Dolu: ${stats.url.filled}/${campaigns.length} (${stats.url.percentage}%)`);
    console.log(`   Reference URL Dolu: ${stats.reference_url.filled}/${campaigns.length} (${stats.reference_url.percentage}%)`);
    console.log(`   Image Dolu: ${stats.image.filled}/${campaigns.length} (${stats.image.percentage}%)`);
    console.log(`   Sector Slug Dolu: ${stats.sector_slug.filled}/${campaigns.length} (${stats.sector_slug.percentage}%)`);
    console.log(`   Min Spend Dolu: ${stats.min_spend.filled}/${campaigns.length} (${stats.min_spend.percentage}%)`);
    console.log(`   Earning Dolu: ${stats.earning.filled}/${campaigns.length} (${stats.earning.percentage}%)`);
    console.log(`   Conditions Dolu: ${stats.conditions.filled}/${campaigns.length} (${stats.conditions.percentage}%)`);
    console.log(`   Participation Method Dolu: ${stats.participation_method.filled}/${campaigns.length} (${stats.participation_method.percentage}%)`);
}

verifyVakifbankCampaigns();
