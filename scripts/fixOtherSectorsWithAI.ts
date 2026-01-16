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

// İzin verilen kategoriler
const ALLOWED_CATEGORIES = [
    'Market & Gıda',
    'Akaryakıt',
    'Giyim & Aksesuar',
    'Restoran & Kafe',
    'Elektronik',
    'Mobilya & Dekorasyon',
    'Kozmetik & Sağlık',
    'E-Ticaret',
    'Ulaşım',
    'Dijital Platform',
    'Kültür & Sanat',
    'Eğitim',
    'Sigorta',
    'Otomotiv',
    'Vergi & Kamu',
    'Turizm & Konaklama',
    'Kuyum, Optik ve Saat',
    'Diğer'
];

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

// Bekleme fonksiyonu
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixOtherSectorsWithAI() {
    console.log('🤖 AI Destekli Sektör Düzeltme Başlıyor...\n');

    // 1. 'Diğer' kategorisindeki kampanyaları çek
    console.log('📚 "Diğer" kategorisindeki kampanyalar yükleniyor...');
    const { data: allCampaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, description, category, sector_slug');

    if (error || !allCampaigns) {
        console.error('❌ Kampanyalar çekilemedi:', error?.message);
        return;
    }

    // JavaScript'te 'Diğer' olanları filtrele
    const campaigns = allCampaigns.filter(c => c.category === 'Diğer');

    console.log(`✅ Toplam ${allCampaigns.length} kampanya, ${campaigns.length} tanesi 'Diğer' kategorisinde.\n`);

    if (campaigns.length === 0) {
        console.log('🎉 Düzeltilecek kampanya yok!');
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
Açıklama: "${campaign.description || 'Yok'}"

Bu kampanya aşağıdaki kategorilerden hangisine en uygun?

Kategoriler:
${ALLOWED_CATEGORIES.join(', ')}

KURALLAR:
- Sadece yukarıdaki listeden BİR kategori seç.
- En uygun kategoriyi döndür.
- Eğer hiçbirine uymuyorsa 'Diğer' döndür.

Çıktı JSON formatında olsun:
{
  "category": "Kategori Adı"
}`;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();

                // JSON parse et
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    console.log('   ⚠️  AI yanıtı JSON formatında değil, atlanıyor.');
                    errorCount++;
                    success = true;
                    break;
                }

                const aiResponse = JSON.parse(jsonMatch[0]);
                const detectedCategory = aiResponse.category?.trim();

                // Eğer AI 'Diğer' döndürdüyse veya geçersiz kategori döndürdüyse, değişiklik yapma
                if (!detectedCategory || detectedCategory === 'Diğer' || !ALLOWED_CATEGORIES.includes(detectedCategory)) {
                    console.log(`   ℹ️  AI kategori bulamadı veya 'Diğer' döndürdü: "${detectedCategory || 'boş'}"`);
                    success = true;
                    break;
                }

                console.log(`   🔍 AI Önerisi: "${detectedCategory}"`);

                // 3. Kampanyayı güncelle
                const updates = {
                    category: detectedCategory,
                    sector_slug: generateSlug(detectedCategory)
                };

                const { error: updateError } = await supabase
                    .from('campaigns')
                    .update(updates)
                    .eq('id', campaign.id);

                if (updateError) {
                    console.log(`   ❌ Güncelleme hatası: ${updateError.message}`);
                    errorCount++;
                } else {
                    console.log(`   ✅ DÜZELDİ: "Diğer" → "${detectedCategory}"`);
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

        // Rate limit için güvenli bekleme (2 saniye)
        await sleep(2000);
    }

    // 4. Özet
    console.log('\n' + '='.repeat(60));
    console.log('🎉 AI Destekli Sektör Düzeltme Tamamlandı!');
    console.log('='.repeat(60));
    console.log(`📊 İşlenen Kampanya: ${processedCount}`);
    console.log(`✅ Güncellenen Kayıt: ${updatedCount}`);
    console.log(`❌ Hata Sayısı: ${errorCount}`);
    console.log(`📈 Başarı Oranı: ${((updatedCount / processedCount) * 100).toFixed(1)}%`);
}

// Scripti çalıştır
fixOtherSectorsWithAI().catch(console.error);
