
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function insertCrystal() {
    console.log("Attempting to insert 'Crystal' into cards table...");

    // First check if it already exists (maybe we missed it?)
    const { data: existing } = await supabase
        .from('cards')
        .select('*')
        .ilike('name', 'Crystal');

    if (existing && existing.length > 0) {
        console.log("Crystal already exists:", JSON.stringify(existing, null, 2));
        return;
    }

    const { data, error } = await supabase
        .from('cards')
        .insert([{ name: 'Crystal', slug: 'crystal' }])
        .select();

    if (error) {
        console.error("Error inserting Crystal:", error.message);
    } else {
        console.log("Success! Inserted:", JSON.stringify(data, null, 2));
    }
}

insertCrystal();
