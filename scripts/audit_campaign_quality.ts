
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { validateDiscountMath, extractMaxDiscount } from './utils/mathValidator';
import { validateDates } from './utils/dateValidator';
import { validateFields, extractFromText, calculateQualityScore } from './utils/fieldValidator';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

interface AuditStats {
    total: number;
    checked: number;
    mathFixed: number;
    datesFixed: number;
    fieldsFixed: number;
    deactivated: number;
    errors: number;
}

// Fetch master sectors once at startup
let masterSectors: string[] = [];

async function fetchMasterSectors(): Promise<string[]> {
    const { data } = await supabase.from('master_sectors').select('name');
    return data?.map(s => s.name) || [];
}

async function logAudit(campaignId: string, auditType: string, fieldName: string | null, oldValue: any, newValue: any, autoFixed: boolean, confidence: number = 1.0) {
    try {
        await supabase.from('campaign_audit_log').insert({
            campaign_id: campaignId,
            audit_type: auditType,
            field_name: fieldName,
            old_value: oldValue ? String(oldValue) : null,
            new_value: newValue ? String(newValue) : null,
            auto_fixed: autoFixed,
            confidence
        });
    } catch (error: any) {
        console.error(`Failed to log audit: ${error.message}`);
    }
}

async function auditCampaign(campaign: any, stats: AuditStats): Promise<void> {
    const updates: any = {};
    let needsUpdate = false;

    // 1. Validate Math
    const mathResult = validateDiscountMath(campaign);
    if (!mathResult.isValid && mathResult.shouldCorrect && mathResult.calculatedPercentage) {
        console.log(`   📐 Math fix: ${campaign.title.substring(0, 50)}...`);
        console.log(`      ${campaign.discount_percentage}% → ${mathResult.calculatedPercentage}%`);

        updates.discount_percentage = mathResult.calculatedPercentage;

        // Also set max_discount if missing
        if (!campaign.max_discount) {
            const maxDiscount = extractMaxDiscount(campaign);
            if (maxDiscount) {
                updates.max_discount = maxDiscount;
            }
        }

        await logAudit(campaign.id, 'math_correction', 'discount_percentage',
            campaign.discount_percentage, mathResult.calculatedPercentage, true, 0.95);

        stats.mathFixed++;
        needsUpdate = true;
    }

    // 2. Validate Dates
    const dateResult = validateDates(campaign);
    if (!dateResult.isValid) {
        if (dateResult.shouldDeactivate) {
            console.log(`   📅 Deactivating expired: ${campaign.title.substring(0, 50)}...`);
            updates.is_active = false;

            await logAudit(campaign.id, 'date_deactivation', 'is_active',
                true, false, true, 1.0);

            stats.deactivated++;
            needsUpdate = true;
        }

        if (dateResult.correctedDates) {
            console.log(`   📅 Date fix: ${campaign.title.substring(0, 50)}...`);
            Object.assign(updates, dateResult.correctedDates);

            await logAudit(campaign.id, 'date_correction', 'dates',
                `${campaign.valid_from} - ${campaign.valid_until}`,
                `${dateResult.correctedDates.valid_from} - ${dateResult.correctedDates.valid_until}`,
                true, 0.9);

            stats.datesFixed++;
            needsUpdate = true;
        }
    }

    // 3. Validate Fields
    const fieldResult = validateFields(campaign);
    if (!fieldResult.isComplete) {
        // Try to extract missing category from title
        if (fieldResult.criticalMissing.includes('category')) {
            const extractedCategory = extractFromText(campaign.title || campaign.description, 'category', masterSectors);
            if (extractedCategory) {
                console.log(`   🏷️  Category fix: ${campaign.title.substring(0, 50)}...`);
                console.log(`      → ${extractedCategory}`);

                updates.category = extractedCategory;

                await logAudit(campaign.id, 'field_extraction', 'category',
                    campaign.category, extractedCategory, true, 0.7);

                stats.fieldsFixed++;
                needsUpdate = true;
            }
        }
    }

    // 4. Calculate Quality Score
    const qualityScore = calculateQualityScore({ ...campaign, ...updates });
    if (campaign.quality_score !== qualityScore) {
        updates.quality_score = qualityScore;
        needsUpdate = true;
    }

    // 5. Mark as auto-corrected if we made changes
    if (needsUpdate) {
        updates.auto_corrected = true;
    }

    // 6. Apply updates
    if (needsUpdate) {
        const { error } = await supabase
            .from('campaigns')
            .update(updates)
            .eq('id', campaign.id);

        if (error) {
            console.error(`   ❌ Update failed: ${error.message}`);
            stats.errors++;
        }
    }

    stats.checked++;
}

async function runQualityAudit() {
    console.log('🔍 Starting Campaign Quality Audit...\n');

    // Fetch master sectors first
    masterSectors = await fetchMasterSectors();
    console.log(`📚 Loaded ${masterSectors.length} sectors from master_sectors table\n`);

    const stats: AuditStats = {
        total: 0,
        checked: 0,
        mathFixed: 0,
        datesFixed: 0,
        fieldsFixed: 0,
        deactivated: 0,
        errors: 0
    };

    try {
        // Fetch all campaigns
        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        stats.total = campaigns?.length || 0;
        console.log(`📊 Found ${stats.total} campaigns to audit\n`);

        // Process each campaign
        for (const campaign of campaigns || []) {
            await auditCampaign(campaign, stats);
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📈 AUDIT SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total campaigns:        ${stats.total}`);
        console.log(`Checked:                ${stats.checked}`);
        console.log(`Math corrections:       ${stats.mathFixed}`);
        console.log(`Date corrections:       ${stats.datesFixed}`);
        console.log(`Field extractions:      ${stats.fieldsFixed}`);
        console.log(`Deactivated (expired):  ${stats.deactivated}`);
        console.log(`Errors:                 ${stats.errors}`);
        console.log('='.repeat(60));

        const totalFixes = stats.mathFixed + stats.datesFixed + stats.fieldsFixed + stats.deactivated;
        if (totalFixes > 0) {
            console.log(`\n✅ Successfully fixed ${totalFixes} issues!`);
        } else {
            console.log('\n✅ All campaigns are already in good shape!');
        }

    } catch (error: any) {
        console.error(`\n❌ Audit failed: ${error.message}`);
        process.exit(1);
    }
}

runQualityAudit();
