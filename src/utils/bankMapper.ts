/**
 * Dynamic Bank Name Mapper - Fetches from Supabase master_banks
 * This replaces the static BANK_NAME_MAP with a dynamic system
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

interface MasterBank {
    id: number;
    name: string;
    slug: string;
    aliases: string[];
    logo_url?: string;
    is_active: boolean;
}

let cachedBanks: MasterBank[] = [];
let lastFetch: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch banks from Supabase (with caching)
 */
async function fetchMasterBanks(): Promise<MasterBank[]> {
    const now = Date.now();

    // Return cache if still valid
    if (cachedBanks.length > 0 && (now - lastFetch) < CACHE_DURATION) {
        return cachedBanks;
    }

    try {
        const { data, error } = await supabase
            .from('master_banks')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');

        if (error) {
            console.error('❌ Error fetching master_banks:', error.message);
            // Fallback to static list if DB fails
            return getStaticBankList();
        }

        cachedBanks = data || [];
        lastFetch = now;
        return cachedBanks;
    } catch (err) {
        console.error('❌ Exception fetching master_banks:', err);
        return getStaticBankList();
    }
}

/**
 * Normalize bank name using master_banks table
 */
export async function normalizeBankName(inputName: string): Promise<string> {
    if (!inputName) return '';

    // Normalize whitespace (trim and collapse multiple spaces)
    const normalizedInput = inputName.trim().replace(/\s+/g, ' ');

    const banks = await fetchMasterBanks();

    // Try exact match
    const exactMatch = banks.find(b => b.name === normalizedInput);
    if (exactMatch) return exactMatch.name;

    // Try case-insensitive match
    const caseMatch = banks.find(b => b.name.toLowerCase() === normalizedInput.toLowerCase());
    if (caseMatch) return caseMatch.name;

    // Try aliases
    const aliasMatch = banks.find(b =>
        b.aliases && b.aliases.some(alias => alias.toLowerCase() === normalizedInput.toLowerCase())
    );
    if (aliasMatch) return aliasMatch.name;

    // No match found, return original (will be caught in data quality checks)
    console.warn(`⚠️  Unknown bank name: "${inputName}" - please add to master_banks`);
    return inputName;
}

/**
 * Get all official bank names
 */
export async function getOfficialBankNames(): Promise<string[]> {
    const banks = await fetchMasterBanks();
    return banks.map(b => b.name);
}

/**
 * Fallback static bank list (used if Supabase is unavailable)
 */
function getStaticBankList(): MasterBank[] {
    return [
        { id: 1, name: 'Garanti BBVA', slug: 'garanti-bbva', aliases: ['Garanti', 'BBVA'], is_active: true },
        { id: 2, name: 'Akbank', slug: 'akbank', aliases: ['Akbank'], is_active: true },
        { id: 3, name: 'İş Bankası', slug: 'is-bankasi', aliases: ['Is Bankasi', 'Isbank'], is_active: true },
        { id: 4, name: 'Yapı Kredi', slug: 'yapi-kredi', aliases: ['Yapı Kredi', 'Yapi Kredi', 'YKB'], is_active: true },
        { id: 5, name: 'Ziraat', slug: 'ziraat-bankasi', aliases: ['Ziraat Bankası', 'Ziraat Bankasi'], is_active: true },
        { id: 6, name: 'Halkbank', slug: 'halkbank', aliases: ['Halk Bankası'], is_active: true },
        { id: 7, name: 'Vakıfbank', slug: 'vakifbank', aliases: ['Vakifbank', 'VakıfBank'], is_active: true },
    ];
}

/**
 * Synchronous version (uses cache, may be stale)
 * Use this only when async is not possible
 */
export function normalizeBankNameSync(inputName: string): string {
    if (!inputName) return '';

    // Normalize whitespace (trim and collapse multiple spaces)
    const normalizedInput = inputName.trim().replace(/\s+/g, ' ');

    // Use cached data
    if (cachedBanks.length === 0) {
        // No cache, use static fallback
        cachedBanks = getStaticBankList();
    }

    const exactMatch = cachedBanks.find(b => b.name === normalizedInput);
    if (exactMatch) return exactMatch.name;

    const caseMatch = cachedBanks.find(b => b.name.toLowerCase() === normalizedInput.toLowerCase());
    if (caseMatch) return caseMatch.name;

    const aliasMatch = cachedBanks.find(b =>
        b.aliases && b.aliases.some(alias => alias.toLowerCase() === normalizedInput.toLowerCase())
    );
    if (aliasMatch) return aliasMatch.name;

    return normalizedInput;
}
