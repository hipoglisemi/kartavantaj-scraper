
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function fixCorruptedCampaigns() {
    console.log('🔄 Fetching campaigns with NULL titles...');

    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, reference_url, bank')
        .is('title', null)
        .limit(500); // Limit to avoid memory issues, run multiple times if needed

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ No corrupted campaigns found.');
        return;
    }

    console.log(`🔍 Found ${campaigns.length} campaigns to fix.`);
    let fixedCount = 0;

    for (const campaign of campaigns) {
        // Skip if no URL
        if (!campaign.reference_url) continue;

        console.log(`\nProcessing ID ${campaign.id} (${campaign.bank})...`);
        try {
            const { data: html } = await axios.get(campaign.reference_url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
                },
                timeout: 10000
            });

            const $ = cheerio.load(html);
            let title = '';

            // Heuristic selectors based on bank
            if (campaign.bank === 'Garanti BBVA') {
                title = $('.campaign-detail-title h1').text().trim() || $('h1').first().text().trim();
            } else if (campaign.bank === 'İş Bankası') {
                title = $('h1.gradient-title-text').text().trim() || $('h1').first().text().trim();
            } else if (campaign.bank === 'Halkbank') { // Paraf
                title = $('.master-banner__content h1').text().trim() || $('h1').first().text().trim();
            } else if (campaign.bank === 'Vakıfbank') {
                title = $('.kampanyaDetay .title h1').text().trim() || $('h1').first().text().trim();
            } else if (campaign.bank === 'Ziraat Bankası') {
                title = $('h1.page-title').text().trim() || $('h1').first().text().trim();
            } else {
                title = $('h1').first().text().trim() || $('title').text().trim();
            }

            // Cleanup title
            title = title.replace(/\s+/g, ' ').trim();

            if (title && title.length > 5 && !title.includes('404') && !title.includes('Bulunamadı')) {
                console.log(`   ✅ Extracted: "${title}"`);

                const { error } = await supabase
                    .from('campaigns')
                    .update({ title: title })
                    .eq('id', campaign.id);

                if (!error) fixedCount++;
                else console.error(`   ❌ Update failed: ${error.message}`);
            } else {
                console.log(`   ⚠️ Could not extract valid title. Found: "${title}"`);
            }

        } catch (e: any) {
            console.error(`   ❌ Failed to fetch: ${e.message}`);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n🎉 Restoration complete. Fixed ${fixedCount} titles.`);
}

fixCorruptedCampaigns();
