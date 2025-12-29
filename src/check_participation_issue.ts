import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkParticipationIssue() {
    console.log('🔍 Checking participation_method vs participation_detail...\n');

    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, participation_method, participation_detail')
        .order('id', { ascending: true });

    console.log(`Found ${campaigns?.length || 0} campaigns\n`);
    console.log('─'.repeat(120));

    let issueCount = 0;

    campaigns?.forEach((c) => {
        const hasDetail = c.participation_detail && Object.keys(c.participation_detail).length > 0;
        const hasInstructions = c.participation_detail?.instructions;
        const hasSMS = c.participation_detail?.sms_to || c.participation_detail?.sms_keyword;

        if (hasDetail && c.participation_method === 'Mobil Uygulama') {
            issueCount++;
            console.log(`\n❌ Issue #${issueCount}: ${c.title}`);
            console.log(`   participation_method: "${c.participation_method}"`);
            console.log(`   participation_detail:`);
            console.log(`     - sms_to: ${c.participation_detail.sms_to || 'null'}`);
            console.log(`     - sms_keyword: ${c.participation_detail.sms_keyword || 'null'}`);
            console.log(`     - wallet_name: ${c.participation_detail.wallet_name || 'null'}`);
            console.log(`     - instructions: ${c.participation_detail.instructions ? c.participation_detail.instructions.substring(0, 80) + '...' : 'null'}`);

            // Önerilecek değer
            let suggested = 'Mobil Uygulama';
            if (hasSMS) {
                suggested = 'SMS';
            }
            console.log(`   ✅ Suggested: "${suggested}"`);
        }
    });

    console.log('\n' + '─'.repeat(120));
    console.log(`\n📊 Summary:`);
    console.log(`   Total Campaigns: ${campaigns?.length || 0}`);
    console.log(`   Issues Found: ${issueCount}`);
    console.log(`   Issue Rate: ${((issueCount / (campaigns?.length || 1)) * 100).toFixed(1)}%`);
}

checkParticipationIssue();
