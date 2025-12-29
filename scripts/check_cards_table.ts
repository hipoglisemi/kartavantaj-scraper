
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkCardsTable() {
    console.log("Checking if 'cards' table exists...");
    const { data, error } = await supabase
        .from('cards')
        .select('id, name')
        .limit(50);

    if (error) {
        console.log("Error finding 'cards' table:", error.message);

        // Try master_cards again or just list * from bank_configs to see if we missed something?
        // No, let's try reading table info is not easy without SQL tool.
        // Let's assume schema is hidden.
    } else {
        console.log("Found 'cards' table! Rows:");
        console.log(JSON.stringify(data, null, 2));
    }
}

checkCardsTable();
