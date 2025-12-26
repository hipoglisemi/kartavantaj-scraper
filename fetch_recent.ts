// fetch_recent.ts
import { supabase } from './src/utils/supabase';

async function fetch() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('bank', 'Akbank')
        .eq('card_name', 'Axess')
        .order('created_at', { ascending: false })
        .limit(5);
    if (error) {
        console.error('Error fetching:', error);
        process.exit(1);
    }
    console.log(JSON.stringify(data, null, 2));
}

fetch();
