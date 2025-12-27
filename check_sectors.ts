import { supabase } from './src/utils/supabase';

async function checkSectors() {
    const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .order('name');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`📊 Total Sectors: ${data?.length}\n`);
    data?.forEach((s, i) => {
        console.log(`${i+1}. ${s.name} (${s.slug})`);
        if (s.keywords) console.log(`   Keywords: ${s.keywords.join(', ')}`);
        console.log('');
    });
}

checkSectors();
