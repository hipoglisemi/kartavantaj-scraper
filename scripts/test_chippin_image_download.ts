import { downloadImageDirectly } from '../src/services/imageService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testChippinImageDownload() {
    console.log('🧪 Testing Chippin Image Download...\n');

    // Sample Chippin image URLs (from actual campaigns)
    const testImages = [
        {
            url: 'https://www.chippin.com/campaign/banner/test_banner_1.png',
            title: 'Test Campaign 1'
        },
        {
            url: 'https://www.chippin.com/campaign/banner/test_banner_2.jpg',
            title: 'Test Campaign 2'
        },
        {
            url: 'https://www.chippin.com/campaign/banner/test_banner_3.png',
            title: 'Test Campaign 3'
        }
    ];

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < testImages.length; i++) {
        const { url, title } = testImages[i];
        console.log(`\n--- Test ${i + 1}/${testImages.length}: ${title} ---`);
        console.log(`URL: ${url}`);

        try {
            const result = await downloadImageDirectly(url, title, 'chippin');

            if (result.includes('supabase')) {
                console.log(`✅ SUCCESS: Image uploaded to Supabase`);
                console.log(`   Public URL: ${result}`);
                successCount++;
            } else if (result === url) {
                console.log(`⚠️  FALLBACK: Returned original URL (download may have failed)`);
                failCount++;
            } else {
                console.log(`❓ UNKNOWN: Unexpected result`);
                failCount++;
            }
        } catch (error: any) {
            console.error(`❌ ERROR: ${error.message}`);
            failCount++;
        }
    }

    console.log(`\n\n📊 Test Results:`);
    console.log(`   ✅ Success: ${successCount}/${testImages.length}`);
    console.log(`   ❌ Failed: ${failCount}/${testImages.length}`);

    if (successCount === testImages.length) {
        console.log('\n🎉 All tests passed!');
    } else if (successCount > 0) {
        console.log('\n⚠️  Some tests failed, but direct download is working');
    } else {
        console.log('\n❌ All tests failed - check Supabase configuration');
    }
}

testChippinImageDownload();
