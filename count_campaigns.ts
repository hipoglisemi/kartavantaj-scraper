import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { count } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true });

console.log(`📊 Total campaigns in database: ${count}`);
