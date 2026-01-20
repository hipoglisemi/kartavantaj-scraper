import * as dotenv from 'dotenv';
dotenv.config();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

async function testCloudflare() {
    console.log('🔍 Testing Cloudflare Upload...\n');
    console.log('CLOUDFLARE_ACCOUNT_ID:', CLOUDFLARE_ACCOUNT_ID ? 'Set ✅' : 'Missing ❌');
    console.log('CLOUDFLARE_API_TOKEN:', CLOUDFLARE_API_TOKEN ? 'Set ✅' : 'Missing ❌');
    console.log('CLOUDFLARE_ACCOUNT_HASH:', CLOUDFLARE_ACCOUNT_HASH ? 'Set ✅' : 'Missing ❌');
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_HASH) {
        console.log('\n❌ Missing Cloudflare credentials!');
        return;
    }
    
    const testImageUrl = 'https://www.maximum.com.tr/contentmanagement/PublishingImages/ETStur_1025_new_580x460.jpg';
    
    try {
        console.log('\n📥 Downloading test image...');
        const response = await fetch(testImageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': 'https://www.maximum.com.tr/',
            }
        });
        
        if (!response.ok) {
            console.log(`❌ Download failed: HTTP ${response.status}`);
            return;
        }
        
        console.log('✅ Image downloaded');
        
        const arrayBuffer = await response.arrayBuffer();
        const formData = new FormData();
        const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
        formData.append('file', blob, 'test.jpg');
        formData.append('id', `test-${Date.now()}`);
        
        console.log('\n📤 Uploading to Cloudflare...');
        const cfResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
                body: formData,
            }
        );
        
        const cfData = await cfResponse.json();
        
        if (cfData.success) {
            const url = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${cfData.result.id}/public`;
            console.log('✅ Upload successful!');
            console.log('URL:', url);
        } else {
            console.log('❌ Upload failed:', cfData.errors?.[0]?.message || 'Unknown error');
            console.log('Response:', JSON.stringify(cfData, null, 2));
        }
        
    } catch (error: any) {
        console.log('❌ Error:', error.message);
    }
}

testCloudflare();
