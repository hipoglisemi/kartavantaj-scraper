import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function seed() {
    console.log('🌱 Seeding State Banks...');

    // 1. HALKBANK
    console.log('   Processing Halkbank...');
    // A. Insert Bank
    let { data: halkbank, error: hbError } = await supabase.from('banks').select('id').eq('name', 'Halkbank').single();
    if (!halkbank) {
        const { data, error } = await supabase.from('banks').insert({ name: 'Halkbank', slug: 'halkbank' }).select().single();
        halkbank = data;
        if(error) console.error('Error creating Halkbank:', error);
    }
    console.log('   Halkbank ID:', halkbank?.id);

    // B. Insert Cards
    if (halkbank) {
        // Paraf
        let { data: paraf } = await supabase.from('cards').select('id').eq('name', 'Paraf').eq('bank_id', halkbank.id).single();
        if (!paraf) {
            const { data, error } = await supabase.from('cards').insert({ name: 'Paraf', bank_id: halkbank.id, slug: 'paraf' }).select().single();
            paraf = data;
            console.log('   Created Paraf card:', data?.id);
        } else {
             console.log('   Paraf card exists:', paraf.id);
        }

        // C. Insert/Update Bank Config
        const configPayload = {
            bank_id: halkbank.id,
            bank_name: 'Halkbank',
            aliases: ['Halk Bankası', 'Halkbank'],
            cards: [
                { id: paraf?.id, name: 'Paraf', keywords: ['Paraf', 'Paraf Gold', 'Paraf Platinum'] }
            ]
        };

        const { error: confError } = await supabase.from('bank_configs').upsert(configPayload, { onConflict: 'bank_id' });
        if(confError) console.error('Error config Halkbank:', confError);
        else console.log('   ✅ Halkbank config updated');
    }

    // 2. VAKIFBANK
    console.log('   Processing Vakıfbank...');
    let { data: vakif, error: vbError } = await supabase.from('banks').select('id').eq('name', 'Vakıfbank').single();
    if (!vakif) {
        const { data, error } = await supabase.from('banks').insert({ name: 'Vakıfbank', slug: 'vakifbank' }).select().single();
        vakif = data;
    }
    console.log('   Vakıfbank ID:', vakif?.id);

    if (vakif) {
        // World (Vakıf) - Note: Generic World might be confused, so we explicitly handle it in ID Mapper logic usually
        // But here we insert a specific card for Vakıfbank
        let { data: vbWorld } = await supabase.from('cards').select('id').eq('name', 'World').eq('bank_id', vakif.id).single();
        if (!vbWorld) {
            const { data } = await supabase.from('cards').insert({ name: 'World', bank_id: vakif.id, slug: 'vakif-world' }).select().single();
            vbWorld = data;
             console.log('   Created Vakıfbank World card:', data?.id);
        }

        let { data: bankomat } = await supabase.from('cards').select('id').eq('name', 'Bankomat').eq('bank_id', vakif.id).single();
        if (!bankomat) {
            const { data } = await supabase.from('cards').insert({ name: 'Bankomat', bank_id: vakif.id, slug: 'bankomat' }).select().single();
            bankomat = data;
             console.log('   Created Bankomat card:', data?.id);
        }

        const configPayload = {
            bank_id: vakif.id,
            bank_name: 'Vakıfbank',
            aliases: ['Vakıfbank', 'Vakifbank'],
            cards: [
                { id: vbWorld?.id, name: 'World', keywords: ['World', 'Vakıfbank World'] },
                { id: bankomat?.id, name: 'Bankomat', keywords: ['Bankomat'] }
            ]
        };
        const { error: confError } = await supabase.from('bank_configs').upsert(configPayload, { onConflict: 'bank_id' });
        if(confError) console.error('Error config Vakıfbank:', confError);
        else console.log('   ✅ Vakıfbank config updated');
    }
}
seed();
