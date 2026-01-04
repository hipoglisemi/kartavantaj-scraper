
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function check() {
    console.log("🔍 Checking 'Kahve Dünyası' campaign...");

    const { data, error } = await supabase
        .from('campaigns')
        .select('title, image_url')
        .eq('bank', 'Chippin')
        .ilike('title', '%Kahve Dünyası%') // Match title roughly
        .limit(1);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data && data.length > 0) {
        const c = data[0];
        console.log(`\n📌 BULUNAN KAMPANYA:`);
        console.log(`Başlık: ${c.title}`);
        console.log(`Resim Linki: ${c.image_url}`);

        if (c.image_url.includes('chippin.com')) {
            console.log("❌ Durum: Hala Chippin linki (Proxy başarısız olmuş).");
        } else if (c.image_url.includes('supabase')) {
            console.log("✅ Durum: Supabase linki (Başarılı).");
        }
    } else {
        console.log("❌ Bu başlıkta kampanya bulunamadı. URL ile arıyorum...");
        // Fallback to URL search
        const urlPart = "Kahve_Dunyasinda_250_TL";
        const { data: data2 } = await supabase
            .from('campaigns')
            .select('title, image_url')
            .ilike('image_url', `%${urlPart}%`);

        if (data2 && data2.length > 0) {
            console.log(`URL ile bulundu: ${data2[0].image_url}`);
        } else {
            console.log("Bulunamadı.");
        }
    }
}

check();
