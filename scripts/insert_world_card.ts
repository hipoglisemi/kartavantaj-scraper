
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function insertWorld() {
    console.log("Attempting to insert 'World' into cards table...");

    const { data, error } = await supabase
        .from('cards')
        .insert([{ name: 'World', slug: 'world' }])
        .select();

    if (error) {
        console.error("Error inserting World:", error.message);
    } else {
        console.log("Success! Inserted:", JSON.stringify(data, null, 2));
    }
}

insertWorld();
