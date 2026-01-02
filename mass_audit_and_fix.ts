import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseSurgical } from './src/services/geminiParser';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function massAudit() {
    console.log('🏗️  Starting Deep Audit & Fix...');

    // Fetch campaigns that need fixing
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .or('brand.is.null,category.eq.Diğer,category.is.null');

    if (error) {
        console.error('❌ Error fetching campaigns:', error.message);
        return;
    }

    console.log(`📊 Found ${data.length} campaigns needing quality improvement.`);

    for (const c of data) {
        console.log(`\n---------------------------------------------------------`);
        console.log(`🔍 Auditing ID ${c.id}: "${c.title}"`);
        console.log(`   [Current] Brand: ${c.brand} | Category: ${c.category}`);

        try {
            // Call surgical AI to fix brand and category
            const surgicalResult = await parseSurgical(
                c.description + '\n' + (c.conditions?.join('\n') || ''),
                c,
                ['brand', 'category'],
                c.url,
                c.bank
            );

            console.log(`   🤖 AI JSON OUTPUT:`, JSON.stringify(surgicalResult, null, 2));

            const updates: any = {};
            if (surgicalResult.brand && surgicalResult.brand !== c.brand) {
                updates.brand = surgicalResult.brand;
            }
            if (surgicalResult.category && surgicalResult.category !== c.category) {
                updates.category = surgicalResult.category;
                // Also update sector_slug
                const { generateSectorSlug } = await import('./src/utils/slugify');
                updates.sector_slug = generateSectorSlug(surgicalResult.category);
            }

            if (Object.keys(updates).length > 0) {
                console.log(`   ✨ UPDATING:`, updates);
                const { error: updateError } = await supabase
                    .from('campaigns')
                    .update({
                        ...updates,
                        auto_corrected: true,
                        math_flags: [...(c.math_flags || []), 'deep_audit_fix_v1']
                    })
                    .eq('id', c.id);

                if (updateError) {
                    console.error(`   ❌ Update Error: ${updateError.message}`);
                } else {
                    console.log(`   ✅ Success.`);
                }
            } else {
                console.log(`   ✅ No changes needed.`);
            }
        } catch (err) {
            console.error(`   ❌ Audit failed for ${c.id}: ${err}`);
        }
    }

    console.log(`\n🎉 Deep Audit & Fix completed.`);
}

massAudit();
