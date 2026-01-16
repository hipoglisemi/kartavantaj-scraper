import { parseWithGemini } from './src/services/geminiParser';

// Test kampanyası: Shell markası başlıkta geçiyor ama AI kaçırabilir
const testCampaign = {
    title: "Shell'de Akaryakıt Alımlarında %10 İndirim",
    description: "Shell istasyonlarında geçerli özel kampanya. Tüm akaryakıt alımlarında geçerlidir.",
    url: "https://example.com/test",
    bank: "Chippin",
    card: "Chippin"
};

async function testSmartRecovery() {
    console.log('🧪 Testing Smart Recovery System...\n');
    console.log('📝 Test Campaign:');
    console.log(`   Title: ${testCampaign.title}`);
    console.log(`   Description: ${testCampaign.description}\n`);

    try {
        const result = await parseWithGemini(
            `${testCampaign.title}\n\n${testCampaign.description}`,
            testCampaign.url,
            testCampaign.bank,
            testCampaign.card
        );

        console.log('\n✅ Parsing Result:');
        console.log(`   Brand: ${result.brand || 'N/A'}`);
        console.log(`   Category: ${result.category || 'N/A'}`);
        console.log(`   Sector Slug: ${result.sector_slug || 'N/A'}`);
        console.log(`   Tags: ${result.tags?.join(', ') || 'N/A'}`);

        // Verify recovery worked
        if (result.brand && result.brand !== 'Genel') {
            console.log('\n🎉 SUCCESS: Brand detected!');
        } else {
            console.log('\n⚠️  WARNING: Brand not detected');
        }

        if (result.category !== 'Diğer') {
            console.log('🎉 SUCCESS: Sector correctly identified!');
        } else {
            console.log('⚠️  WARNING: Sector is still "Diğer"');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSmartRecovery();
