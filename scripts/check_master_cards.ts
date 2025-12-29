
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkMasterCards() {
    console.log("Checking if 'master_cards' table exists...");

    // Try to select from suspected table
    const { data, error } = await supabase
        .from('master_cards')
        .select('*')
        .limit(5);

    if (error) {
        console.log("Error (Table likely doesn't exist):", error.message);

        // Check if there is another table with 'cards' in name?
        // We can't list tables easily via client.
    } else {
        console.log("Table exists! Rows:", JSON.stringify(data, null, 2));
    }
}

checkMasterCards();
