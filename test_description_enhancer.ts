import { enhanceDescription } from './src/services/descriptionEnhancer';

async function test() {
    const samples = [
        'Akbank Axess Migros Kampanyası',
        'Garanti BBVA Bonus Shell İndirim Fırsatı',
        'Yapı Kredi World Pegasus Airlines Mil Kampanyası'
    ];

    console.log('🧪 Testing Description Enhancer\n');

    for (const sample of samples) {
        console.log(`📝 Original: "${sample}"`);
        const enhanced = await enhanceDescription(sample);
        console.log(`✨ Enhanced: "${enhanced}"`);
        console.log('---\n');
    }
}

test().catch(console.error);
