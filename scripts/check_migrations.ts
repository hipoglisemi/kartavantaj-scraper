// scripts/check_migrations.ts
// Quick check to verify if migrations were applied

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function checkMigrations() {
    console.log('🔍 Checking Migration Status...\n');

    // Test 1: Check if AI columns exist in campaign_quality_audits
    console.log('1️⃣ Testing campaign_quality_audits table...');
    try {
        const { data, error } = await supabase
            .from('campaign_quality_audits')
            .select('id, ai_status, ai_confidence, ai_patch, status')
            .limit(1);

        if (error) {
            if (error.message.includes('column') && error.message.includes('does not exist')) {
                console.log('   ❌ AI auto-fix columns NOT found');
                console.log(`   Error: ${error.message}`);
                return false;
            }
            throw error;
        }

        console.log('   ✅ AI auto-fix columns exist');
    } catch (err: any) {
        console.log(`   ❌ Error: ${err.message}`);
        return false;
    }

    // Test 2: Check if publish_status exists in campaigns
    console.log('\n2️⃣ Testing campaigns table...');
    try {
        const { data, error } = await supabase
            .from('campaigns')
            .select('id, publish_status, publish_updated_at')
            .limit(1);

        if (error) {
            if (error.message.includes('column') && error.message.includes('does not exist')) {
                console.log('   ❌ Publish gating columns NOT found');
                console.log(`   Error: ${error.message}`);
                return false;
            }
            throw error;
        }

        console.log('   ✅ Publish gating columns exist');
    } catch (err: any) {
        console.log(`   ❌ Error: ${err.message}`);
        return false;
    }

    // Test 3: Check data distribution
    console.log('\n3️⃣ Checking data distribution...');

    // Check publish_status distribution
    const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('publish_status')
        .limit(1000);

    if (!campaignsError && campaigns) {
        const statusCounts: Record<string, number> = {};
        campaigns.forEach(c => {
            const status = c.publish_status || 'null';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        console.log('   Campaigns publish_status distribution:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`      ${status}: ${count}`);
        });
    }

    // Check ai_status distribution
    const { data: audits, error: auditsError } = await supabase
        .from('campaign_quality_audits')
        .select('ai_status')
        .limit(1000);

    if (!auditsError && audits) {
        const aiStatusCounts: Record<string, number> = {};
        audits.forEach(a => {
            const status = a.ai_status || 'null';
            aiStatusCounts[status] = (aiStatusCounts[status] || 0) + 1;
        });

        console.log('\n   Audits ai_status distribution:');
        Object.entries(aiStatusCounts).forEach(([status, count]) => {
            console.log(`      ${status}: ${count}`);
        });
    }

    console.log('\n✅ All migrations verified successfully!');
    return true;
}

checkMigrations()
    .then((success) => {
        if (success) {
            console.log('\n🎉 Migrations are working correctly!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Some migrations may not be applied. Check errors above.');
            process.exit(1);
        }
    })
    .catch((err) => {
        console.error('\n❌ Migration check failed:', err);
        process.exit(1);
    });
