
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from './src/services/geminiParser';
import { scrapeCampaignDetail } from './src/scrapers/ziraat/bankkart';
import * as puppeteer from 'puppeteer';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function fixZiraatCampaigns() {
    console.log('🚀 Ziraat AI Auto-Fix başlatılıyor...');

    // Load error list from the audit report or re-fetch (re-fetching is safer)
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'Ziraat')
        .order('created_at', { ascending: false });

    if (error || !campaigns) {
        console.error('❌ DB Hatası:', error?.message);
        return;
    }

    // Filter campaigns that need fixing (same logic as audit)
    const toFix = campaigns.filter(c => {
        const issues = [];
        if (!c.brand || c.brand === '' || c.brand === 'Genel') issues.push('brand');
        if (!c.category || c.category === 'Diğer') issues.push('category');
        if (c.min_spend === 0 || c.min_spend === null) issues.push('math');
        if (!c.earning || c.earning === '') issues.push('earning');
        if (c.title === 'Başlıksız Kampanya') issues.push('title');
        return issues.length > 0;
    });

    console.log(`📊 Toplam ${toFix.length} hatalı kampanya tespit edildi.\n`);

    const browser = await puppeteer.launch({ headless: true });

    for (const campaign of toFix) {
        console.log(`\n🛠  Fixing: [${campaign.title}] -> ${campaign.reference_url}`);

        try {
            const page = await browser.newPage();
            // Reuse the existing scraper detail logic to get HTML
            const detail = await scrapeCampaignDetail(page, campaign.reference_url);

            if (!detail) {
                console.log(`   ⚠️  URL'e erişilemedi, atlanıyor.`);
                await page.close();
                continue;
            }

            console.log(`   🧠 AI re-parsing with Python Hybrid Model...`);
            const metadata = {
                title: detail.title,
                image: detail.image,
                bank: 'Ziraat',
                card: 'Bankkart'
            };
            const aiData = await parseWithGemini(detail.html, campaign.reference_url, 'Ziraat', 'Bankkart', metadata);

            if (aiData) {
                const { error: updateError } = await supabase
                    .from('campaigns')
                    .update({
                        title: aiData.title || campaign.title,
                        description: aiData.description || campaign.description,
                        brand: Array.isArray(aiData.brand) ? aiData.brand[0] : aiData.brand,
                        category: aiData.category,
                        sector_slug: aiData.sector_slug,
                        min_spend: aiData.min_spend,
                        max_discount: aiData.max_discount,
                        earning: aiData.earning,
                        valid_until: aiData.valid_until,
                        eligible_customers: aiData.eligible_customers,
                        ai_method: aiData.ai_method, // Waiting for Supabase schema update
                        ai_tokens: aiData.ai_tokens, // Waiting for Supabase schema update
                        is_active: true
                    })
                    .eq('id', campaign.id);

                if (updateError) {
                    console.error(`   ❌ Update Hatası:`, updateError.message);
                } else {
                    console.log(`   ✅ Başarıyla güncellendi: ${aiData.title}`);
                }
            }

            await page.close();
        } catch (err: any) {
            console.error(`   ❌ Hata:`, err.message);
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 2000));
    }

    await browser.close();
    console.log('\n🏁 Ziraat AI Auto-Fix tamamlandı!');
}

fixZiraatCampaigns();
