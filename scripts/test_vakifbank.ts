/**
 * Test script for Vakıfbank scraper with new bankMapper
 * Tests only the first campaign to verify the system works
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { normalizeBankName } from '../src/utils/bankMapper';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function testVakifbank() {
    console.log('🧪 Testing Vakıfbank Scraper with Bank Mapper...\n');

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    try {
        // Go to Vakıfbank campaigns
        await page.goto('https://www.vakifkart.com.tr/kampanyalar/sayfa/1', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Get first campaign link
        const firstLink = await page.evaluate(() => {
            const el = document.querySelector('div.mainKampanyalarDesktop:not(.eczk) .list a.item');
            return el ? el.getAttribute('href') : null;
        });

        if (!firstLink) {
            console.error('❌ No campaign found');
            return;
        }

        const fullUrl = firstLink.startsWith('http') ? firstLink : `https://www.vakifkart.com.tr${firstLink}`;
        console.log(`📍 Testing URL: ${fullUrl}\n`);

        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Extract title
        const title = await page.evaluate(() => {
            const titleEl = document.querySelector('.kampanyaDetay .title h1');
            return titleEl ? titleEl.innerText.trim() : 'No title';
        });

        console.log(`📝 Title: ${title}`);

        // Test bank name normalization
        const testCases = ['Vakıfbank', 'Vakifbank', 'vakıfbank', 'VAKIFBANK'];

        console.log('\n🔍 Testing Bank Name Normalization:');
        for (const test of testCases) {
            const normalized = await normalizeBankName(test);
            const icon = normalized === 'Vakıfbank' ? '✅' : '❌';
            console.log(`${icon} "${test}" → "${normalized}"`);
        }

        // Check if it would save correctly
        const finalBankName = await normalizeBankName('Vakıfbank');
        console.log(`\n💾 Would save to DB as: bank = "${finalBankName}"`);

        // Verify in master_banks
        const { data: bankData } = await supabase
            .from('master_banks')
            .select('*')
            .eq('name', finalBankName)
            .single();

        if (bankData) {
            console.log(`✅ Bank exists in master_banks:`);
            console.log(`   - Name: ${bankData.name}`);
            console.log(`   - Slug: ${bankData.slug}`);
            console.log(`   - Aliases: ${bankData.aliases.join(', ')}`);
        } else {
            console.log(`❌ Bank NOT found in master_banks!`);
        }

        console.log('\n✅ Test completed successfully!');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testVakifbank();
