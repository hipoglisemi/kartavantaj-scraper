
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function inspectSchema() {
    console.log('🔍 Inspecting campaigns table schema...');

    // We can't directly show commands via client library easily without knowing admin password for direct connection,
    // but we can try to insert a float into suspected integer columns to fail? 
    // Or better, let's just query limits or try to deduce from previous migrations.
    // Actually, we can assume fields like `discount_percentage`, `min_spend`, `max_discount` are candidates.

    // Let's look at a sample row where discount_percentage is null or number
    const { data, error } = await supabase
        .from('campaigns')
        .select('discount_percentage, min_spend, max_discount')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample Data Types:', data);
    }

    // Checking 33.33 which looks like a percentage.
    // I suspect `discount_percentage` is INTEGER, but scraper sends 33.33.

    console.log('Checking migration files references...');
}

inspectSchema();
