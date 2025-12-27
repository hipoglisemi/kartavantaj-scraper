import { supabase } from './src/utils/supabase';

async function checkDescription() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, description')
        .limit(3);
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log('📝 Campaign Description Samples:\n');
    data?.forEach(c => {
        console.log(`ID: ${c.id}`);
        console.log(`Title: ${c.title}`);
        console.log(`Description: ${c.description?.substring(0, 200)}...`);
        console.log(`Type: ${typeof c.description}`);
        console.log('---\n');
    });
}

checkDescription();
