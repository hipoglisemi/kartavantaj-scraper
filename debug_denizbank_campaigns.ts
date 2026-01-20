import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function fetchProblematicCampaigns() {
    const slugs = [
        'google-play-harcamalariniza-50-indirim',
        'pegasus-ucak-biletinize-500-tl-bonus',
        'prontotourda-2000-tlye-varan-bonus',
        'denizbank-kredi-kartinizla-secili-egitim-kurumlarinda-5-taksit-firsati',
        'denizbank-kredi-kartinizla-sigorta-ve-bes-odemelerinize-3-20990'
    ];

    console.log('🔍 Fetching problematic campaigns...\n');

    for (const slug of slugs) {
        const { data, error } = await supabase
            .from('campaigns')
            .select('id, title, slug, reference_url, min_spend, max_discount, earning, discount, discount_percentage, description')
            .eq('slug', slug)
            .single();

        if (error) {
            console.log(`❌ ${slug}: Not found`);
            continue;
        }

        console.log(`\n📊 Campaign: ${data.title}`);
        console.log(`   Slug: ${data.slug}`);
        console.log(`   URL: ${data.reference_url}`);
        console.log(`   min_spend: ${data.min_spend}`);
        console.log(`   max_discount: ${data.max_discount}`);
        console.log(`   earning: ${data.earning}`);
        console.log(`   discount: ${data.discount}`);
        console.log(`   discount_percentage: ${data.discount_percentage}`);
        console.log(`   description: ${data.description?.substring(0, 100)}...`);
    }

    // Also search by title patterns
    console.log('\n\n🔍 Searching by title patterns...\n');

    const patterns = [
        '%google play%',
        '%pegasus%500%',
        '%prontotour%',
        '%eğitim%taksit%',
        '%sigorta%bes%'
    ];

    for (const pattern of patterns) {
        const { data, error } = await supabase
            .from('campaigns')
            .select('id, title, slug, reference_url, min_spend, max_discount, earning, bank')
            .ilike('title', pattern)
            .eq('bank', 'Denizbank')
            .limit(3);

        if (data && data.length > 0) {
            console.log(`\nPattern "${pattern}":`);
            data.forEach(c => {
                console.log(`   - ${c.title}`);
                console.log(`     slug: ${c.slug || 'MISSING'}`);
                console.log(`     min_spend: ${c.min_spend}, max_discount: ${c.max_discount}, earning: ${c.earning}`);
            });
        }
    }
}

fetchProblematicCampaigns();
