import { supabase } from './src/utils/supabase';

async function checkSectorsDetailed() {
    const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .order('name');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`\n📊 SEKTÖR ŞEMASI - TOPLAM ${data?.length} SEKTÖR\n`);
    console.log('=' .repeat(80));
    
    data?.forEach((s, i) => {
        console.log(`\n${i+1}. ${s.name.toUpperCase()}`);
        console.log(`   Slug: ${s.slug}`);
        if (s.description) console.log(`   Açıklama: ${s.description}`);
        if (s.keywords && s.keywords.length > 0) {
            console.log(`   Keywords (${s.keywords.length}): ${s.keywords.slice(0, 10).join(', ')}${s.keywords.length > 10 ? '...' : ''}`);
        } else {
            console.log(`   ⚠️ Keywords: YOK`);
        }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Toplam ${data?.length} sektör yüklendi.`);
    
    // Check keyword coverage
    const totalKeywords = data?.reduce((sum, s) => sum + (s.keywords?.length || 0), 0) || 0;
    console.log(`📝 Toplam keyword: ${totalKeywords}`);
    console.log(`📊 Ortalama keyword per sektör: ${(totalKeywords / data!.length).toFixed(1)}`);
}

checkSectorsDetailed();
