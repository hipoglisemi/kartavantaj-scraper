import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Supabase Bağlantısı
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

// Slug oluşturucu (Basit)
function generateSlug(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[ğ]/g, 'g')
        .replace(/[ü]/g, 'u')
        .replace(/[ş]/g, 's')
        .replace(/[ı]/g, 'i')
        .replace(/[ö]/g, 'o')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function fixGenericData() {
    console.log('🚀 Temizlik Operasyonu Başlıyor...');

    // 1. Master Markaları Çek
    console.log('📚 Master Markalar yükleniyor...');
    const { data: brandsData } = await supabase.from('master_brands').select('name');
    const masterBrands = brandsData?.map(b => b.name) || [];
    console.log(`✅ ${masterBrands.length} marka hafızaya alındı.`);

    // 2. Hatalı/Eksik Kampanyaları Çek
    console.log('🔍 "Genel" veya "Diğer" etiketli kampanyalar taranıyor...');

    // Genel markalı kampanyalar
    const { data: genelCampaigns } = await supabase
        .from('campaigns')
        .select('id, title, description, brand, category, sector_slug')
        .eq('brand', 'Genel');

    // Diğer sektörlü kampanyalar
    const { data: digerCampaigns } = await supabase
        .from('campaigns')
        .select('id, title, description, brand, category, sector_slug')
        .eq('category', 'Diğer');

    // Merge and deduplicate
    const campaignsMap = new Map();
    [...(genelCampaigns || []), ...(digerCampaigns || [])].forEach(c => {
        campaignsMap.set(c.id, c);
    });
    const campaigns = Array.from(campaignsMap.values());

    if (campaigns.length === 0) {
        console.log('✅ Temizlenecek kampanya bulunamadı!');
        return;
    }

    console.log(`📋 İncelenecek Kampanya Sayısı: ${campaigns.length}`);

    let updateCount = 0;

    // 3. Her Kampanyayı İncele
    for (const campaign of campaigns) {
        let newBrand = campaign.brand;
        let newCategory = campaign.category;
        let shouldUpdate = false;

        const textToScan = `${campaign.title} ${campaign.description || ''}`.toLocaleLowerCase('tr-TR');
        const titleLower = campaign.title.toLocaleLowerCase('tr-TR');

        // --- AŞAMA 1: MARKA KURTARMA ---
        if (newBrand === 'Genel' || !newBrand) {
            for (const mb of masterBrands) {
                if (titleLower.includes(mb.toLocaleLowerCase('tr-TR'))) {
                    newBrand = mb;
                    shouldUpdate = true;
                    console.log(`   💡 MARKA BULUNDU: "${campaign.title.substring(0, 30)}..." -> ${mb}`);
                    break;
                }
            }
        }

        // --- AŞAMA 2: SEKTÖR KURTARMA ---
        if (newCategory === 'Diğer' || newBrand === 'Genel') {
            const originalCategory = newCategory;

            if (textToScan.includes('market') || textToScan.includes('gıda') || textToScan.includes('bakkal') || textToScan.includes('süpermarket')) newCategory = 'Market & Gıda';
            else if (textToScan.includes('akaryakıt') || textToScan.includes('benzin') || textToScan.includes('mazot') || textToScan.includes('petrol') || textToScan.includes('istasyon')) newCategory = 'Akaryakıt';
            else if (textToScan.includes('giyim') || textToScan.includes('moda') || textToScan.includes('tekstil') || textToScan.includes('kıyafet') || textToScan.includes('ayakkabı')) newCategory = 'Giyim & Aksesuar';
            else if (textToScan.includes('restoran') || textToScan.includes('yemek') || textToScan.includes('kafe') || textToScan.includes('burger') || textToScan.includes('pizza') || textToScan.includes('kahve')) newCategory = 'Restoran & Kafe';
            else if (textToScan.includes('seyahat') || textToScan.includes('tatil') || textToScan.includes('otel') || textToScan.includes('uçak') || textToScan.includes('konaklama') || textToScan.includes('turizm')) newCategory = 'Turizm & Konaklama';
            else if (textToScan.includes('elektronik') || textToScan.includes('teknoloji') || textToScan.includes('bilgisayar') || textToScan.includes('telefon')) newCategory = 'Elektronik';
            else if (textToScan.includes('mobilya') || textToScan.includes('dekorasyon') || textToScan.includes('yatak')) newCategory = 'Mobilya & Dekorasyon';
            else if (textToScan.includes('sağlık') || textToScan.includes('hastane') || textToScan.includes('eczane') || textToScan.includes('kozmetik')) newCategory = 'Kozmetik & Sağlık';
            else if (textToScan.includes('e-ticaret') || textToScan.includes('online alışveriş')) newCategory = 'E-Ticaret';

            if (originalCategory !== newCategory) {
                shouldUpdate = true;
                console.log(`   🔄 SEKTÖR DÜZELDİ: "${campaign.title.substring(0, 30)}..." -> ${newCategory}`);
            }
        }

        // --- AŞAMA 3: GÜNCELLEME ---
        if (shouldUpdate) {
            const updates: any = {
                brand: newBrand,
                category: newCategory,
                brand_suggestion: null
            };

            if (newCategory !== campaign.category) {
                updates.sector_slug = generateSlug(newCategory);
            }

            const { error: updateError } = await supabase
                .from('campaigns')
                .update(updates)
                .eq('id', campaign.id);

            if (!updateError) {
                updateCount++;
            } else {
                console.error(`   ❌ Güncelleme hatası (ID: ${campaign.id}):`, updateError.message);
            }
        }
    }

    console.log(`\n🎉 Operasyon Tamamlandı!`);
    console.log(`✅ Toplam Düzelen Kayıt: ${updateCount}`);
}

fixGenericData();
