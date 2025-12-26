import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function patchHierarchy() {
    console.log('🔧 Eksik hiyerarşi verilerini yamalıyorum...');

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, bank, card_name')
        .or('bank_id.is.null, card_id.is.null');

    if (error) {
        console.error('❌ Hata:', error.message);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('✅ Yamalanacak kampanya bulunmadı.');
        return;
    }

    for (const c of campaigns) {
        const updates: any = {};

        if (c.bank.toLowerCase().includes('akbank')) updates.bank_id = 'akbank';
        if (c.card_name.toLowerCase().includes('axess')) updates.card_id = 'axess';

        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
                .from('campaigns')
                .update(updates)
                .eq('id', c.id);

            if (updateError) {
                console.error(`❌ ID ${c.id} güncellenemedi:`, updateError.message);
            } else {
                console.log(`✅ ID ${c.id} güncellendi: ${JSON.stringify(updates)}`);
            }
        }
    }
}

patchHierarchy().catch(console.error);
