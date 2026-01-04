import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function verifyIDs() {
    console.log('🔍 Verifying ID assignments for the latest İş Bankası campaigns...');
    const { data, error } = await supabase.from('campaigns')
        .select('title, bank, bank_id, card_name, card_id, category, sector_id, brand, brand_id')
        .eq('bank', 'İş Bankası')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        data.forEach((c, i) => {
            console.log(`\n--- [${i + 1}] ${c.title.substring(0, 40)}... ---`);
            console.log(`🏦 Bank: ${c.bank} -> ID: ${c.bank_id || '❌ MISSING'}`);
            console.log(`💳 Card: ${c.card_name} -> ID: ${c.card_id || '❌ MISSING'}`);
            console.log(`📁 Category: ${c.category} -> Sector ID: ${c.sector_id || '❌ MISSING'}`);
            console.log(`🏷️ Brand: ${c.brand} -> Brand ID: ${c.brand_id || '❌ MISSING'}`);
        });
    } else {
        console.log('❌ No campaigns found.');
    }
}
verifyIDs();
