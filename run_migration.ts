import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function runMigration() {
    console.log('🚀 Running Supabase Migration...\n');

    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'migrations', 'add_missing_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log();

    try {
        // Note: Supabase JS client doesn't support raw SQL execution directly
        // We need to use the REST API or Supabase Management API
        console.log('⚠️  Note: Supabase JS client cannot execute raw SQL.');
        console.log('📋 Please run this migration manually:\n');
        console.log('1. Go to: https://supabase.com/dashboard/project/_/sql/new');
        console.log('2. Copy the SQL from: migrations/add_missing_columns.sql');
        console.log('3. Paste and run it in the SQL Editor\n');
        console.log('Or use Supabase CLI:');
        console.log('   supabase db push\n');

        // Alternative: Try to add columns using table operations
        console.log('🔧 Attempting alternative approach via RPC...\n');

        // Check if columns already exist
        const { data: testData } = await supabase
            .from('campaigns')
            .select('*')
            .limit(1);

        if (testData && testData.length > 0) {
            const columns = Object.keys(testData[0]);
            const hasIsActive = columns.includes('is_active');
            const hasReferenceUrl = columns.includes('reference_url');

            if (hasIsActive && hasReferenceUrl) {
                console.log('✅ Columns already exist! Migration not needed.');
                return;
            }

            console.log(`Missing columns: ${!hasIsActive ? 'is_active ' : ''}${!hasReferenceUrl ? 'reference_url' : ''}`);
        }

        console.log('\n❌ Cannot auto-apply migration.');
        console.log('Please apply the SQL manually from the file above.');

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

runMigration();
