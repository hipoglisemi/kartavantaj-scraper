import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

// Supabase Bağlantısı
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

// Gemini AI Bağlantısı
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Slug oluşturucu
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

// 1 saniye bekleme fonksiyonu
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixGenericWithAI() {
    console.log('🤖 AI Destekli Marka Tespiti Başlıyor...\n');

    // 1. Tüm kampanyaları çek ve JavaScript'te filtrele
    console.log('📚 Kampanyalar yükleniyor...');
    const { data: allCampaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, brand, category, sector_slug');

    if (error || !allCampaigns) {
        console.error('❌ Kampanyalar çekilemedi:', error?.message);
        return;
    }

    // JavaScript'te 'Genel' olanları filtrele
    const campaigns = allCampaigns.filter(c => {
        if (typeof c.brand === 'string') {
            return c.brand === 'Genel';
        } else if (Array.isArray(c.brand)) {
            return c.brand.includes('Genel') || c.brand.length === 0;
        }
        return false;
    });

    console.log(`✅ Toplam ${allCampaigns.length} kampanya, ${campaigns.length} tanesi 'Genel' markalı.\n`);

    if (campaigns.length === 0) {
        console.log('🎉 Temizlenecek kampanya yok!');
        return;
    }

    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // 2. Her kampanya için AI'ya sor (Retry Logic ile)
    for (const campaign of campaigns) {
        processedCount++;
        console.log(`\n[${processedCount}/${campaigns.length}] İşleniyor: "${campaign.title.substring(0, 50)}..."`);

        let success = false;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries && !success; attempt++) {
            try {
                // AI'ya soru sor
                const prompt = `Başlık: "${campaign.title}"

Bu kampanyadaki ana ticari markayı (Merchant/Brand) çıkar. 

KURALLAR:
- Eğer başlıkta belirgin bir marka/işletme adı varsa (Örn: Toyzz Shop, IKEA, Migros), o markayı döndür.
- Eğer sadece genel bir sektör/kategori kampanyasıysa (Örn: "Tüm Marketlerde", "Akaryakıt İstasyonlarında"), 'Genel' döndür.
- Banka veya kart adları (Axess, Bonus, Maximum vb.) marka DEĞİLDİR, 'Genel' döndür.

Çıktı JSON formatında olsun:
{
  "brand": "Marka Adı veya Genel",
  "category": "En uygun kategori (Market & Gıda, Elektronik, Giyim & Aksesuar, Restoran & Kafe, Turizm & Konaklama, Akaryakıt, Mobilya & Dekorasyon, Kozmetik & Sağlık, E-Ticaret, veya Diğer)"
}`;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();

                // JSON parse et
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    console.log('   ⚠️  AI yanıtı JSON formatında değil, atlanıyor.');
                    errorCount++;
                    success = true; // Tekrar deneme, bir sonraki kampanyaya geç
                    break;
                }

                const aiResponse = JSON.parse(jsonMatch[0]);
                const detectedBrand = aiResponse.brand?.trim();
                const detectedCategory = aiResponse.category?.trim();

                // Eğer AI 'Genel' döndürdüyse, değişiklik yapma
                if (!detectedBrand || detectedBrand === 'Genel') {
                    console.log('   ℹ️  AI marka bulamadı, "Genel" olarak kalacak.');
                    success = true;
                    break;
                }

                console.log(`   🔍 AI Bulgusu: Marka="${detectedBrand}", Kategori="${detectedCategory}"`);

                // 3. Master brands tablosunda kontrol et
                const { data: existingBrand } = await supabase
                    .from('master_brands')
                    .select('name')
                    .ilike('name', detectedBrand)
                    .single();

                if (!existingBrand) {
                    // Yeni marka ekle
                    const { error: insertError } = await supabase
                        .from('master_brands')
                        .insert([{ name: detectedBrand }]);

                    if (insertError) {
                        console.log(`   ⚠️  Marka eklenemedi: ${insertError.message}`);
                    } else {
                        console.log(`   ✨ Yeni marka eklendi: ${detectedBrand}`);
                    }
                }

                // 4. Kampanyayı güncelle
                const updates: any = {
                    brand: detectedBrand,
                    brand_suggestion: null
                };

                if (detectedCategory && detectedCategory !== 'Diğer') {
                    updates.category = detectedCategory;
                    updates.sector_slug = generateSlug(detectedCategory);
                }

                const { error: updateError } = await supabase
                    .from('campaigns')
                    .update(updates)
                    .eq('id', campaign.id);

                if (updateError) {
                    console.log(`   ❌ Güncelleme hatası: ${updateError.message}`);
                    errorCount++;
                } else {
                    console.log(`   ✅ DÜZELDİ: Marka="${detectedBrand}", Kategori="${detectedCategory || campaign.category}"`);
                    updatedCount++;
                }

                success = true;

            } catch (error: any) {
                // Exponential backoff: 5s, 10s, 20s
                const delay = attempt * 5000;

                if (attempt < maxRetries) {
                    console.log(`   ⚠️  Hata alındı (Deneme ${attempt}/${maxRetries}). ${delay}ms bekleniyor...`);
                    await sleep(delay);
                } else {
                    console.log(`   ❌ Bu kampanya için pes edildi: ${error.message}`);
                    errorCount++;
                }
            }
        }

        // Rate limit için güvenli bekleme (3 saniye)
        await sleep(3000);
    }

    // 5. Özet
    console.log('\n' + '='.repeat(60));
    console.log('🎉 AI Destekli Temizlik Tamamlandı!');
    console.log('='.repeat(60));
    console.log(`📊 İşlenen Kampanya: ${processedCount}`);
    console.log(`✅ Güncellenen Kayıt: ${updatedCount}`);
    console.log(`❌ Hata Sayısı: ${errorCount}`);
    console.log(`📈 Başarı Oranı: ${((updatedCount / processedCount) * 100).toFixed(1)}%`);
}

// Scripti çalıştır
fixGenericWithAI().catch(console.error);
