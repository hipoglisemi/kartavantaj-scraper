/**
 * ID Mapper Utility
 * Maps string values (bank, card, brand, sector) to their database IDs
 */

import { supabase } from './supabase';

export interface IDMapping {
    bank_id?: string;
    card_id?: string;
    brand_id?: string;
    sector_id?: string;
}

/**
 * Looks up IDs for bank, card, brand, and sector from master tables
 */
export async function lookupIDs(
    bank?: string,
    cardName?: string,
    brand?: string,
    sectorSlug?: string
): Promise<IDMapping> {
    const ids: IDMapping = {};

    // 1. Lookup bank_id and card_id from relational tables (banks/cards)
    if (bank) {
        // Search banks by name or aliases
        const { data: bankData } = await supabase
            .from('banks')
            .select('id, slug')
            .or(`name.ilike."${bank}",aliases.cs.{"${bank}"}`)
            .maybeSingle();

        if (bankData) {
            ids.bank_id = bankData.slug;

            // Find card_id within this bank's cards
            if (cardName) {
                const { data: cardData } = await supabase
                    .from('cards')
                    .select('slug')
                    .eq('bank_id', bankData.id)
                    .ilike('name', cardName)
                    .maybeSingle();

                if (cardData) {
                    ids.card_id = cardData.slug;
                }
            }
        } else {
            // Fallback for banks not yet in relational table (Legacy lookup)
            const { data: bankConfig } = await supabase
                .from('bank_configs')
                .select('bank_id, cards')
                .ilike('bank_name', bank)
                .maybeSingle();

            if (bankConfig) {
                ids.bank_id = bankConfig.bank_id;
                if (cardName && bankConfig.cards) {
                    const card = bankConfig.cards.find((c: any) =>
                        c.name.toLowerCase() === cardName.toLowerCase()
                    );
                    if (card) ids.card_id = card.id;
                }
            }
        }
    }

    // 2. Lookup brand_id from master_brands
    if (brand) {
        // Handle comma-separated brands - take the first one
        const primaryBrand = brand.split(',')[0].trim();

        const { data: brandData } = await supabase
            .from('master_brands')
            .select('id')
            .ilike('name', primaryBrand)
            .single();

        if (brandData) {
            ids.brand_id = brandData.id;
        }
    }

    // 3. Lookup sector_id from master_sectors
    if (sectorSlug) {
        const { data: sectorData } = await supabase
            .from('master_sectors')
            .select('id')
            .eq('slug', sectorSlug)
            .single();

        if (sectorData) {
            ids.sector_id = sectorData.id;
        }
    }

    return ids;
}
