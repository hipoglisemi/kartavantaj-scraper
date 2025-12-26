// check_approved.ts
import { supabase } from './src/utils/supabase';

async function check() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, is_approved, is_active, bank, card_name')
        .eq('bank', 'Akbank')
        .eq('card_name', 'Axess')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    console.log('Last 5 Axess campaigns:');
    data?.forEach(c => {
        console.log(`ID: ${c.id}, Title: ${c.title.substring(0, 40)}...`);
        console.log(`  is_approved: ${c.is_approved}, is_active: ${c.is_active}`);
    });
}

check();
