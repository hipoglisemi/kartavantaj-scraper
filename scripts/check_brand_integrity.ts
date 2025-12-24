import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrands() {
    console.log('Checking master_brands...');

    const { data: brands, error } = await supabase
        .from('master_brands')
        .select('*');

    if (error) {
        console.error('Error fetching brands:', error);
        return;
    }

    const commaSeparated = brands.filter(b => b.name.includes(','));
    const longBrands = brands.filter(b => b.name.length > 30);
    const fbRelated = brands.filter(b => b.name.toLowerCase().includes('fenerbahçe') || b.name.toLowerCase().includes('topuk'));

    console.log(`Total brands: ${brands.length}`);

    if (commaSeparated.length > 0) {
        console.log('Brands with commas:', commaSeparated.map(b => b.name));
    } else {
        console.log('No brands with commas found.');
    }

    if (longBrands.length > 0) {
        console.log('Long brands (>30 chars):', longBrands.map(b => b.name));
    } else {
        console.log('No very long brands found.');
    }

    console.log('Fenerbahçe related brands:', fbRelated.map(b => b.name));
}

checkBrands();
