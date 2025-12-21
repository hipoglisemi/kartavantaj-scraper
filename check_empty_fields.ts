import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkEmptyFields() {
    const { data } = await supabase
        .from('campaigns')
        .select('id, title, min_spend, earning, discount_percentage')
        .or('min_spend.is.null,min_spend.eq.0,earning.is.null');
    
    console.log(`\n📊 Campaigns with empty/zero min_spend or earning: ${data?.length || 0}\n`);
    
    if (data && data.length > 0) {
        data.slice(0, 5).forEach(c => {
            console.log(`ID: ${c.id}`);
            console.log(`Title: ${c.title}`);
            console.log(`Min Spend: ${c.min_spend || 'NULL'}`);
            console.log(`Earning: ${c.earning || 'NULL'}`);
            console.log(`Discount %: ${c.discount_percentage || 'NULL'}`);
            console.log('---');
        });
    }
}

checkEmptyFields();
