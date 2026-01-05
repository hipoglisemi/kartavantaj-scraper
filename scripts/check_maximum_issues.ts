
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cppayemlaxblidgslfit.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwcGF5ZW1sYXhibGlkZ3NsZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDI5NzcsImV4cCI6MjA3NzMxODk3N30.kGDbguiboL1FPkpRSntdiKPAXtxNJMJ3FIcNixmCyME'
);

async function checkMaximumIssues() {
    console.log('🔍 Checking Maximum campaigns for missing brand/sector...');

    // Fetch last 200 campaigns for 'İş Bankası'
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, brand, sector_slug, ai_parsing_incomplete, created_at')
        .eq('bank', 'İş Bankası')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error('Error fetching campaigns:', error);
        return;
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('No recent Maximum campaigns found.');
        return;
    }

    console.log(`Found ${campaigns.length} campaigns.`);

    let issues = 0;
    campaigns.forEach(c => {
        const missingBrand = !c.brand || c.brand === 'genel' || c.brand === '' || c.brand === null;
        const missingSector = !c.sector_slug || c.sector_slug === 'diger' || c.sector_slug === null;

        if (missingBrand || missingSector) {
            issues++;
            console.log(`❌ [ID: ${c.id}] ${c.title.substring(0, 40)}...`);
            if (missingBrand) console.log(`   - Bad Brand: '${c.brand}'`);
            if (missingSector) console.log(`   - Bad Sector: '${c.sector_slug}'`);
        }
    });

    if (issues === 0) {
        console.log('✅ Recent Maximum campaigns look good!');
    } else {
        console.log(`\nFound ${issues} campaigns with issues.`);
    }
}

checkMaximumIssues();
