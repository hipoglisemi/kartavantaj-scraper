
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cppayemlaxblidgslfit.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwcGF5ZW1sYXhibGlkZ3NsZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDI5NzcsImV4cCI6MjA3NzMxODk3N30.kGDbguiboL1FPkpRSntdiKPAXtxNJMJ3FIcNixmCyME'
);

async function checkStatusDeep() {
    console.log('\nChecking for statuses NOT EQUAL to "processing"...');

    const { data: statusData, error } = await supabase
        .from('campaigns')
        .select('publish_status')
        .neq('publish_status', 'processing')
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (statusData && statusData.length > 0) {
        const statuses = [...new Set(statusData.map(s => s.publish_status))];
        console.log('✅ Found valid statuses:', statuses);
    } else {
        console.log('❌ No non-processing statuses found in the first results.');
    }
}

checkStatusDeep();
