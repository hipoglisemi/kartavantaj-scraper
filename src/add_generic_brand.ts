import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function addGenericBrand() {
    console.log('🏷️  Adding "Genel" brand to master_brands...\n');

    // Check if already exists
    const { data: existing } = await supabase
        .from('master_brands')
        .select('*')
        .eq('name', 'Genel')
        .single();

    if (existing) {
        console.log('✅ "Genel" brand already exists:');
        console.log(`   ID: ${existing.id}`);
        console.log(`   Name: ${existing.name}`);
        console.log(`   Slug: ${existing.slug}`);
        return;
    }

    // Add new brand
    const { data, error } = await supabase
        .from('master_brands')
        .insert({
            name: 'Genel',
            slug: 'genel',
            logo: null
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log('✅ "Genel" brand added successfully:');
    console.log(`   ID: ${data.id}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Slug: ${data.slug}`);
}

addGenericBrand();
