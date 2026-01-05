
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cppayemlaxblidgslfit.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwcGF5ZW1sYXhibGlkZ3NsZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDI5NzcsImV4cCI6MjA3NzMxODk3N30.kGDbguiboL1FPkpRSntdiKPAXtxNJMJ3FIcNixmCyME'
);

async function checkStatus() {
    console.log('\nChecking publish_status values (distinct):');

    try {
        const { data: statusData, error } = await supabase
            .from('campaigns')
            .select('publish_status')
            .limit(100);

        if (error) {
            console.error('Error fetching statuses:', error);
            return;
        }

        if (statusData) {
            const statuses = [...new Set(statusData.map(s => s.publish_status))];
            console.log('Existing statuses found:', statuses);
        } else {
            console.log('No data found.');
        }

    } catch (e) {
        console.error("Exception:", e);
    }
}

checkStatus();
