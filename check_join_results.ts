import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHierarchyData() {
    console.log('🔍 Hiyerarşi verilerini kontrol ediyorum...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name, bank_id, card_id, cards(name, slug)')
        .order('id', { ascending: false });

    if (error) {
        console.error('❌ Hata:', error.message);
        return;
    }

    console.log(`📊 Toplam ${data?.length} kampanya:\n`);
    data?.forEach(c => {
        console.log(`ID: ${c.id}`);
        console.log(`  Başlık: ${c.title.substring(0, 50)}...`);
        console.log(`  Banka: ${c.bank} (bank_id: ${c.bank_id})`);
        console.log(`  Kart: ${c.card_name} (card_id: ${c.card_id})`);
        console.log(`  Join Sonucu (cards): ${c.cards ? JSON.stringify(c.cards) : 'NULL'}`);
        console.log('---');
    });
}

checkHierarchyData().catch(console.error);
