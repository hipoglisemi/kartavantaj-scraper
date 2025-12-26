import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetchCampaigns() {
    console.log('🧪 fetchCampaigns sorgusunu test ediyorum...');

    // query from campaignService.ts
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, description, bank, card_name, category, valid_until, image, is_approved, created_at, url, badge_text, badge_color, views, min_spend, earning, discount, participation_method, valid_from, brand, max_discount, discount_percentage, valid_locations, is_active, sector_slug, eligible_customers, conditions, participation_points, ai_enhanced, bank_id, card_id, brand_id, sector_id, slug, cards(name, image_url, slug)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Supabase Sorgu Hatası:');
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log(`✅ Başarılı! ${data?.length} kampanya getirildi.`);
        if (data && data.length > 0) {
            console.log('Örnek veri (ilk kayıt):');
            console.log(JSON.stringify(data[0], null, 2));
        }
    }
}

testFetchCampaigns().catch(console.error);
