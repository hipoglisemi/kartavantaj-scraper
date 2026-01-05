
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cppayemlaxblidgslfit.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwcGF5ZW1sYXhibGlkZ3NsZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDI5NzcsImV4cCI6MjA3NzMxODk3N30.kGDbguiboL1FPkpRSntdiKPAXtxNJMJ3FIcNixmCyME'
);

async function checkBanks() {
    console.log('🔍 Checking distinct banks...');

    // Hack to get distinct banks (Supabase doesn't have .distinct() easily in js client without rpc generally, but let's try reading all bank columns)
    // Or just fetch latest 100 and print unique banks.
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('bank')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error(error);
        return;
    }

    const banks = [...new Set(campaigns.map(c => c.bank))];
    console.log('Banks found:', banks);
}

checkBanks();
