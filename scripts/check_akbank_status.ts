import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cppayemlaxblidgslfit.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwcGF5ZW1sYXhibGlkZ3NsZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDI5NzcsImV4cCI6MjA3NzMxODk3N30.kGDbguiboL1FPkpRSntdiKPAXtxNJMJ3FIcNixmCyME'
);

async function checkAkbank() {
    console.log('🔍 checking recent Akbank campaigns...');

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, bank, card_name, publish_status, created_at, reference_url')
        .or('bank.ilike.Akbank,bank_id.eq.akbank')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} recent Akbank campaigns:\n`);
        data.forEach((c, i) => {
            const statusIcon = c.publish_status === 'AI_PUBLISHED' ? '🤖' : '📝';
            console.log(`${i + 1}. [${statusIcon} ${c.publish_status || 'DRAFT'}] ${c.title}`);
            console.log(`   ID: ${c.id} | Bank: ${c.bank} | Card: ${c.card_name}`);
            console.log(`   Created: ${c.created_at}`);
            console.log(`   URL: ${c.reference_url}\n`);
        });
    } else {
        console.log('No Akbank campaigns found matching the criteria.');
    }
}

checkAkbank();
