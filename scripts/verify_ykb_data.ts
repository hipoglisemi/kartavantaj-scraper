
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function verifyYkbData() {
    console.log("🔍 Verifying Yapı Kredi Data (Latest 40 campaigns)...\n");

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select(`
            id,
            title,
            description,
            image,
            bank,
            card_name,
            min_spend,
            earning,
            discount,
            category,
            sector_slug,
            bank_id,
            card_id,
            created_at
        `)
        .eq('bank', 'Yapı Kredi') // Query by text name to ensure we catch all
        .order('created_at', { ascending: false })
        .limit(40);

    if (error) {
        console.error("❌ Error fetching campaigns:", error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log("⚠️ No campaigns found for Yapı Kredi.");
        return;
    }

    let stats = {
        total: campaigns.length,
        missingImage: 0,
        missingMinSpend: 0,
        missingIds: 0,
        badSector: 0
    };

    console.log(`📊 Found ${campaigns.length} campaigns. Analyzing...\n`);

    campaigns.forEach((c, index) => {
        const hasImage = c.image && c.image.length > 5;
        const hasMinSpend = c.min_spend !== null && c.min_spend !== undefined;
        const hasIds = c.bank_id === 'yapi-kredi' && !!c.card_id;

        // Detailed Print for first few and then summary
        console.log(`🔹 [${index + 1}] ${c.card_name} - ${c.title.substring(0, 60)}...`);
        console.log(`   🖼️ Image: ${hasImage ? '✅ OK' : '❌ MISSING'} (${c.image?.substring(0, 30)}...)`);
        console.log(`   💰 Math: MinSpend=${c.min_spend}, Earning=${c.earning}, Discount=${c.discount}`);
        console.log(`   🆔 IDs: BankID=${c.bank_id}, CardID=${c.card_id}, Sector=${c.sector_slug}`);
        console.log(`   📂 Category: ${c.category}`);

        // Basic Heuristic Checks
        if (!hasImage) stats.missingImage++;
        if (!hasMinSpend) {
            // Check if title has numbers but min_spend is 0
            if (/\d+/.test(c.title) && c.min_spend === 0) {
                console.log(`      ⚠️ WARNING: Title contains numbers but min_spend is 0/null`);
                stats.missingMinSpend++;
            }
        }
        if (!hasIds) {
            console.log(`      ❌ ERROR: Missing correct IDs!`);
            stats.missingIds++;
        }
        if (c.sector_slug === 'diger' && !c.title.toLowerCase().includes('diğer')) {
            // Maybe fine, but worth noting
        }
        if (c.sector_slug === 'ev-mobilya-beyaz-esya') {
            console.log(`      ❌ ERROR: Bad Sector Slug detected!`);
            stats.badSector++;
        }

        console.log('--------------------------------------------------');
    });

    console.log("\n📈 Verification Summary:");
    console.log(`Total Checked: ${stats.total}`);
    console.log(`Missing/Bad Images: ${stats.missingImage}`);
    console.log(`Suspicious Min Spend: ${stats.missingMinSpend}`);
    console.log(`ID Issues: ${stats.missingIds}`);
    console.log(`Bad Sector Slugs: ${stats.badSector}`);
}

verifyYkbData();
