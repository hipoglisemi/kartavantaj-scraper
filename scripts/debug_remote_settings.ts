
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Credentials from debug_banks.ts which are confirmed working
const URL = 'https://cppayemlaxblidgslfit.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwcGF5ZW1sYXhibGlkZ3NsZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDI5NzcsImV4cCI6MjA3NzMxODk3N30.kGDbguiboL1FPkpRSntdiKPAXtxNJMJ3FIcNixmCyME';

const supabase = createClient(URL, KEY);

async function checkSettings() {
    console.log('🔍 Checking site_settings table...');

    // 1. Try Select
    const { data, error } = await supabase.from('site_settings').select('*').limit(1);

    if (error) {
        console.error('❌ SELECT Error:', error);
    } else {
        console.log('✅ SELECT Success: Data found');
        const json = JSON.stringify(data);
        const sizeBytes = new TextEncoder().encode(json).length;
        console.log(`📦 Payload Size: ${(sizeBytes / 1024).toFixed(2)} KB (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`);

        if (sizeBytes > 1024 * 1024) {
            console.warn('⚠️ WARNING: Payload is over 1MB!');
        }
    }

    // 2. Try Upsert (Write)
    console.log('✏️ Attempting dummy write...');
    const dummyData = {
        id: 1,
        updated_at: new Date().toISOString(),
        settings: { test: true }
    };

    const { error: writeError } = await supabase
        .from('site_settings')
        .upsert(dummyData);

    if (writeError) {
        console.error('❌ WRITE Error:', writeError);
    } else {
        console.log('✅ WRITE Success!');
    }

    // 2. Try Upsert (Write) with REAL data size simulation (optional, skip for now to avoid breaking DB)
    /*
    console.log('✏️ Attempting write...');
    // ...
    */
}

checkSettings();
