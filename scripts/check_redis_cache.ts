import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkCache() {
    try {
        if (!process.env.UPSTASH_REDIS_REST_URL) {
            console.log('❌ UPSTASH_REDIS_REST_URL missing in .env');
            return;
        }

        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });

        const KEY = 'campaigns:all_v8';
        console.log(`🔍 Checking Redis Key: ${KEY}`);

        const exists = await redis.exists(KEY);
        if (!exists) {
            console.log('❌ Cache MISS: Key does not exist.');
            return;
        }

        const ttl = await redis.ttl(KEY);
        console.log(`✅ Cache HIT: Key exists.`);
        console.log(`⏳ TTL (Remaining Seconds): ${ttl}`);
        console.log(`🕒 TTL (Minutes): ${(ttl / 60).toFixed(1)}m`);

        const value = await redis.get(KEY);
        // Upstash might return object directly if JSON
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        console.log(`📦 Payload Size: ${(str.length / 1024).toFixed(2)} KB`);

    } catch (e: any) {
        console.error('❌ Redis Error:', e.message);
    }
}

checkCache();
