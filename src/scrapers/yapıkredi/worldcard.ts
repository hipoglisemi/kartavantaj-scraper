/**
 * WorldCard Scraper with AI Parser and Auto Badge Assignment
 * Fetches campaigns and enriches with Gemini AI
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWithGemini } from '../services/geminiParser';
import { assignBadge } from '../services/badgeAssigner';
import { postProcessCampaign } from '../services/postProcessor';

dotenv.config();

const API_URL = 'https://www.worldcard.com.tr/api/campaigns?campaignSectorKey=tum-kampanyalar&campaignSectorId=6d897e71-1849-43a3-a64f-62840e8c0442&campaignTypeId=0&keyword=';
const BASE_URL = 'https://www.worldcard.com.tr';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Referer': 'https://www.worldcard.com.tr/kampanyalar',
    'x-requested-with': 'XMLHttpRequest',
    'accept': '*/*'
};

interface WorldCardAPIItem {
    Url: string;
    ImageUrl: string;
    SpotTitle?: string;
    PageTitle?: string;
    Title?: string;
}

interface WorldCardAPIResponse {
    Items: WorldCardAPIItem[];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAllCampaigns(): Promise<WorldCardAPIItem[]> {
    const allCampaigns: WorldCardAPIItem[] = [];
    let page = 1;
    const maxPages = 50;

    console.log('🔍 Fetching WorldCard campaigns...\n');

    while (page <= maxPages) {
        try {
            console.log(`📄 Page ${page}...`);

            const response = await fetch(API_URL, {
                headers: { ...HEADERS, page: String(page) }
            });

            if (!response.ok) {
                console.error(`❌ API error: ${response.status}`);
                break;
            }

            const data: WorldCardAPIResponse = await response.json() as WorldCardAPIResponse;

            if (!data.Items || data.Items.length === 0) {
                console.log(`✅ Reached end at page ${page - 1}\n`);
                break;
            }

            console.log(`   Found ${data.Items.length} campaigns`);
            allCampaigns.push(...data.Items);

            page++;
            await sleep(1500);

        } catch (error) {
            console.error(`❌ Error on page ${page}:`, error);
            break;
        }
    }

    console.log(`\n🎉 Total campaigns: ${allCampaigns.length}\n`);
    return allCampaigns;
}

async function saveToSupabase(campaigns: WorldCardAPIItem[], useAI: boolean = false, limit?: number) {
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
    );

    console.log(`💾 Saving to Supabase${useAI ? ' with AI parsing' : ''}...\n`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    const campaignsToProcess = limit ? campaigns.slice(0, limit) : campaigns;

    for (const item of campaignsToProcess) {
        try {
            const url = item.Url.startsWith('http') ? item.Url : `${BASE_URL}${item.Url}`;

            // Check if exists
            const { data: existing } = await supabase
                .from('campaigns')
                .select('id')
                .eq('url', url)
                .single();

            if (existing) {
                console.log(`⏭️  ${item.SpotTitle || item.Title} (already exists)`);
                skipped++;
                continue;
            }

            let campaign: any = {
                title: item.SpotTitle || item.PageTitle || item.Title || 'Untitled',
                url,
                image: item.ImageUrl.startsWith('http')
                    ? item.ImageUrl.split('?')[0]
                    : `${BASE_URL}${item.ImageUrl.split('?')[0]}`,
                provider: 'World Card (Yapı Kredi)',
                card_name: 'World',
                source_url: BASE_URL,
                created_at: new Date().toISOString()
            };

            // AI Enhancement
            if (useAI) {
                try {
                    console.log(`🤖 AI parsing: ${campaign.title}...`);

                    const html = await fetch(url).then(r => r.text());
                    const aiData = await parseWithGemini(html, url);

                    campaign = {
                        ...campaign,
                        ...aiData,
                        // Keep original image and card_name
                        image: campaign.image,
                        card_name: campaign.card_name
                    };

                    // 🧹 Auto Post-Processing
                    const cleaned = postProcessCampaign(campaign);
                    campaign.brand = cleaned.brand;
                    campaign.earning = cleaned.earning;

                    if (cleaned.changes.length > 0) {
                        console.log(`   🧹 Cleaned: ${cleaned.changes.join(', ')}`);
                    }

                    // Assign badge based on campaign type
                    const badge = assignBadge(campaign);
                    campaign.badge_text = badge.text;
                    campaign.badge_color = badge.color;

                    console.log(`✅ ${campaign.title}`);
                } catch (aiError) {
                    console.warn(`⚠️  AI failed for ${campaign.title}, using basic data`);
                }
            } else {
                console.log(`✅ ${campaign.title}`);
            }

            const { error } = await supabase
                .from('campaigns')
                .insert(campaign);

            if (error) {
                console.error(`❌ ${campaign.title}: ${error.message}`);
                failed++;
            } else {
                success++;
            }

            await sleep(useAI ? 2000 : 500);

        } catch (error) {
            console.error(`❌ Error:`, error);
            failed++;
        }
    }

    console.log(`\n📊 Results: ${success} success, ${skipped} skipped, ${failed} failed\n`);
}

async function main() {
    const args = process.argv.slice(2);
    const useAI = args.includes('--ai');
    const testMode = args.includes('--test');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 WorldCard Scraper ${useAI ? '+ AI Parser' : '(Basic)'}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
        const campaigns = await fetchAllCampaigns();

        if (campaigns.length > 0) {
            if (testMode) {
                console.log('🧪 TEST MODE: Processing only 5 campaigns\n');
                await saveToSupabase(campaigns, useAI, 5);
            } else {
                await saveToSupabase(campaigns, useAI);
            }
        } else {
            console.log('⚠️  No campaigns found');
        }

    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export { fetchAllCampaigns, saveToSupabase };

// Helper function to format duration
function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}
