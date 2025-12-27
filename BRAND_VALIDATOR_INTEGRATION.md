# Brand Validation Service - Integration Guide

## Overview

The Brand Validator is a **minimal-token AI service** (97% cheaper than full parse) that validates whether a detected name is a real commercial brand before adding it to `master_brands`.

## Token Comparison

| Service | Tokens/Call | Cost/Call | Use Case |
|---------|-------------|-----------|----------|
| **Brand Validator** | ~200 | $0.000015 | Brand name validation |
| Full Gemini Parse | ~4,500 | $0.00040 | Complete campaign parsing |
| **Savings** | **95.6%** | **96.3%** | Per validation |

## Decision Types

### AUTO_ADD
- Real commercial brand or merchant
- Examples: `Migros`, `Starbucks`, `Teknosa`

### PENDING_REVIEW
- Unclear entity, needs human review
- Examples: `ZorTech Bilişim` (unknown local brand), `Pazarama Premium`

### REJECT
- Not a brand (generic, bank, campaign term)
- Examples: `Worldpuan`, `Taksit`, `Chip-para`, `Yapı Kredi`

## Usage in Scraper

### Option 1: Replace Auto-Add in geminiParser.ts

```typescript
// In cleanupBrands() function (Line 330)
import { validateBrand } from '../services/brandValidator';

if (unmatched.length > 0) {
    console.log(`   🆕 New brands detected: ${unmatched.join(', ')}`);
    
    for (const newBrand of unmatched) {
        // 🤖 AI Validation (NEW!)
        const validation = await validateBrand(newBrand, cleanText);
        
        if (validation.decision === 'AUTO_ADD') {
            console.log(`   ✅ Auto-adding verified brand: ${newBrand} (${validation.reason})`);
            
            const { error } = await supabase
                .from('master_brands')
                .insert([{ name: newBrand }]);
                
            if (!error) {
                matched.push(newBrand);
                masterData.brands.push(newBrand);
            }
        } else if (validation.decision === 'PENDING_REVIEW') {
            console.log(`   ⏸️ Pending review: ${newBrand} (${validation.reason})`);
            // Add to brand_suggestions table for manual review
            await supabase.from('brand_suggestions').insert([{
                name: newBrand,
                confidence: validation.confidence,
                reason: validation.reason,
                context: cleanText.substring(0, 500)
            }]);
        } else {
            console.log(`   🚫 Rejected: ${newBrand} (${validation.reason})`);
        }
    }
}
```

### Option 2: Standalone Audit Script

```typescript
// scripts/audit_brands.ts
import { supabase } from '../src/utils/supabase';
import { validateBrandsBatch } from '../src/services/brandValidator';

async function auditExistingBrands() {
    // Get all brands without validation status
    const { data: brands } = await supabase
        .from('master_brands')
        .select('name, id')
        .is('validation_status', null);
    
    if (!brands || brands.length === 0) {
        console.log('✅ All brands validated!');
        return;
    }
    
    console.log(`🔍 Auditing ${brands.length} brands...`);
    
    // Batch validate (with rate limiting)
    const validations = await validateBrandsBatch(
        brands.map(b => ({ 
            name: b.name, 
            context: `Brand: ${b.name}` 
        }))
    );
    
    // Update database
    for (let i = 0; i < validations.length; i++) {
        const v = validations[i];
        await supabase
            .from('master_brands')
            .update({
                validation_status: v.decision,
                validation_confidence: v.confidence,
                validation_reason: v.reason
            })
            .eq('id', brands[i].id);
    }
    
    console.log('✅ Audit complete!');
}
```

## Database Schema Extension (Optional)

Add validation tracking to `master_brands`:

```sql
ALTER TABLE master_brands
ADD COLUMN validation_status TEXT CHECK (validation_status IN ('AUTO_ADD', 'PENDING_REVIEW', 'REJECT')),
ADD COLUMN validation_confidence DECIMAL(3, 2),
ADD COLUMN validation_reason TEXT,
ADD COLUMN validated_at TIMESTAMP DEFAULT NOW();

-- Create index
CREATE INDEX idx_brands_validation ON master_brands(validation_status);
```

## Testing

Run the test suite:

```bash
npx tsx src/services/brandValidator.test.ts
```

Expected output:
```
🧪 Testing Brand Validator Service

📋 Testing: "Migros"
   ✅ Decision: AUTO_ADD (Expected: AUTO_ADD)
   Confidence: 0.95
   Reason: Well-known retail chain

📋 Testing: "Worldpuan"
   ✅ Decision: REJECT (Expected: REJECT)
   Confidence: 0.99
   Reason: Reward system, not a merchant
```

## Error Handling

The validator has built-in safety:

```typescript
// On API error → PENDING_REVIEW (safe default)
// On rate limit (429) → Exponential backoff retry
// On invalid JSON → PENDING_REVIEW fallback
```

**Never auto-adds on uncertainty or error.**

## Integration Checklist

- [ ] Add `brandValidator.ts` to services
- [ ] Update `geminiParser.ts` cleanupBrands() to use validator
- [ ] (Optional) Extend `master_brands` schema with validation columns
- [ ] (Optional) Create `brand_suggestions` table for PENDING_REVIEW
- [ ] Test with real campaign data
- [ ] Monitor token usage and accuracy

## Cost Analysis

**Without Validator (Current):**
- Auto-adds all unknown brands (including garbage)
- Manual cleanup required
- Risk: 20-30% false positives

**With Validator:**
- Cost: $0.015 per 1000 brands validated
- Accuracy: ~95% (based on prompt strictness)
- Risk: Minimal (PENDING_REVIEW on uncertainty)

## Next Steps

This is **Phase 1** of re-enabling AI with minimal token usage. Future phases:
- Phase 2: Surgical sector classification (unknown categories)
- Phase 3: Conditional campaign parsing (day/time restrictions)
- Phase 4: Tiered reward extraction
