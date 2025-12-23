import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_ANON_KEY; // Workflow passes service role key here

async function applySql(filename: string) {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.error('❌ Missing credentials (SUPABASE_URL or SUPABASE_ANON_KEY/SERVICE_ROLE)');
        process.exit(1);
    }

    const sqlPath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ SQL file not found: ${filename}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`🚀 Applying SQL from ${filename}...`);

    // Using the Supabase SQL API (REST)
    // Note: URL structure for SQL execution is usually /rest/v1/rpc/execute_sql if enabled,
    // but the most direct way for internal tools is often the Management API or a custom RPC.
    // However, since we want to be fully automatic and might not have an existing RPC,
    // we will check if we can use the 'service_role' to run DDL via PostgREST if configured, 
    // OR we will create an RPC once if possible.

    // BETTER APPROACH: Since we can't guarantee a generic 'execute_sql' RPC exists,
    // we will use the fetch API to hit the Supabase SQL endpoint directly if we had the password,
    // but we only have the service_role key.

    // WAIT: There is a trick with the admin client, but it still doesn't support raw SQL.
    // The most robust way in a GitHub Action environment is to use the Supabase CLI,
    // but if the user hasn't linked it, we can use a temporary Node script that uses 'pg' library.
    // Since 'pg' is not in package.json, I'll use a built-in-only or very simple approach.

    console.log('💡 Note: Attempting to apply SQL via REST API / SQL Executor...');

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ sql_query: sql })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Execution failed: ${error}`);
        }

        console.log('✅ SQL applied successfully!');
    } catch (err: any) {
        console.error('❌ Failed to apply SQL:', err.message);
        console.log('⚠️  Falling back: If "exec" RPC is missing, please run the SQL manually once.');
        console.log('   The script will continue with the audit assuming the table exists.');
    }
}

// Get filename from CLI args
const file = process.argv[2] || 'create_system_statistics.sql';
applySql(file);
