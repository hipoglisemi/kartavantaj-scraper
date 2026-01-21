import { supabase } from '../src/utils/supabase';

async function checkMigrationBacklog() {
    console.log('📊 Analyzing Migration Backlog...');

    // 1. Total Pending (false)
    const { count: pendingCount, error: err1 } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('image_migrated', false);

    // 2. Pending and on Supabase
    const { count: supabaseCount, error: err2 } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('image_migrated', false)
        .or(`image.like.%supabase.co/storage/v1/object/public/campaign-images/%,image_url.like.%supabase.co/storage/v1/object/public/campaign-images/%`);

    // 3. Pending but on Bank URLs
    const { count: bankCount, error: err3 } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('image_migrated', false)
        .or(`image.like.%maximum.com.tr%,image.like.%isbank.com.tr%,image_url.like.%maximum.com.tr%,image_url.like.%isbank.com.tr%`);

    if (err1 || err2 || err3) {
        console.error('❌ Error querying database');
        return;
    }

    console.log(`----------------------------------------`);
    console.log(`📉 Toplam 'image_migrated: false' olan: ${pendingCount}`);
    console.log(`🏗️  Supabase üzerinde olup taşınmayı bekleyen: ${supabaseCount}`);
    console.log(`🏦 Hala banka linkinde olan (Scraper bekleyen): ${bankCount}`);
    console.log(`----------------------------------------`);

    if (supabaseCount && supabaseCount > 0) {
        const { data: samples } = await supabase
            .from('campaigns')
            .select('id, title, bank, card_name')
            .eq('image_migrated', false)
            .or(`image.like.%supabase.co/storage/v1/object/public/campaign-images/%,image_url.like.%supabase.co/storage/v1/object/public/campaign-images/%`)
            .limit(5);

        console.log('📋 Örnek taşınacak kampanyalar:');
        samples?.forEach(s => console.log(`   - [${s.bank} ${s.card_name}] ${s.title}`));
    }
}

checkMigrationBacklog().catch(console.error);
