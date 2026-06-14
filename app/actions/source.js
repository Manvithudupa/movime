"use server"
import { logger } from "@/utils/logger";

export async function getAnimePaheSources(animeSession, episodeSession) {
    try {
        const API_URL = process.env.ANIMEPAHE_API_URL;
        if (!API_URL) {
            logger.log("[AnimePahe] API URL not configured");
            return null;
        }

        logger.log(`[AnimePahe] Fetching sources for anime_session: ${animeSession}, episode_session: ${episodeSession}`);
        
        const response = await fetch(`${API_URL}/sources?anime_session=${animeSession}&episode_session=${episodeSession}`);
        
        if (!response.ok) {
            logger.error(`[AnimePahe] Error fetching sources: ${response.status} ${response.statusText}`);
            return null;
        }

        const sources = await response.json();
        logger.log(`[AnimePahe] Found ${sources?.length || 0} sources`);
        logger.log(`[AnimePahe] Raw sources from API:`, JSON.stringify(sources, null, 2));

        // Return sources in iframe-friendly format
        // Since resolver doesn't work, we'll use the Kwik URLs directly for iframe
        const formattedResponse = {
            sources: sources.map((source) => ({
                url: source.url,  // Kwik embed URL
                quality: source.quality || 'default',
                isM3U8: false,  // Not m3u8, it's iframe
                type: 'iframe',  // Mark as iframe source
            })),
            // Also keep raw sources for iframe fallback
            rawSources: sources,
        };
        
        logger.log(`[AnimePahe] Formatted response:`, JSON.stringify(formattedResponse, null, 2));
        return formattedResponse;
    } catch (error) {
        logger.error("[AnimePahe] Error fetching sources:", error.message);
        return null;
    }
}

export async function getFlixHQSources(episodeId, server = 'vidcloud') {
    try {
        const API_URL = process.env.FLIXHQ_API_URL;
        if (!API_URL || !episodeId) {
            logger.log("[FlixHQ] API URL not configured or episodeId missing");
            return null;
        }

        logger.log(`[FlixHQ] Fetching sources for episode: ${episodeId}, server: ${server}`);
        
        const response = await fetch(`${API_URL}/api/flixhq/sources/${episodeId}?server=${server}`);
        
        if (!response.ok) {
            logger.error(`[FlixHQ] Error fetching sources: ${response.status} ${response.statusText}`);
            return null;
        }

        const result = await response.json();
        logger.log(`[FlixHQ] Raw response:`, result);
        logger.log(`[FlixHQ] Found ${result?.data?.sources?.length || 0} sources`);
        
        // Format sources for Vidstack player with proxy support
        const PROXY_URI = process.env.NEXT_PUBLIC_PROXY_URI;
        logger.log(`[FlixHQ] Proxy URI:`, PROXY_URI);
        
        const formattedSources = result.data?.sources?.map(source => {
            // Use proxy for m3u8 URLs to avoid CORS
            const url = PROXY_URI && source.isM3u8
                ? `${PROXY_URI}${encodeURIComponent(source.url)}`
                : source.url;
            logger.log(`[FlixHQ] Original:`, source.url);
            logger.log(`[FlixHQ] Proxied:`, url);
            return {
                url: url,
                quality: source.quality || 'auto',
                type: source.isM3u8 ? 'hls' : 'video'
            };
        }) || [];
        
        logger.log(`[FlixHQ] Formatted sources for Vidstack:`, formattedSources);
        
        // Format subtitles for Vidstack - ensure proper format with src property
        const formattedSubtitles = result.data?.subtitles?.map((sub, index) => {
            // Try to detect language from label or file URL
            let label = sub.label || 'Unknown';
            let isEnglish = false;
            
            // If label is missing or generic, try to extract from filename
            if (!sub.label || label === 'Unknown') {
                const urlPath = sub.file || sub.url || '';
                
                // Common language patterns in filenames
                if (urlPath.includes('eng') || urlPath.includes('english')) {
                    label = 'English';
                    isEnglish = true;
                } else if (urlPath.includes('spa') || urlPath.includes('spanish')) label = 'Spanish';
                else if (urlPath.includes('fre') || urlPath.includes('french')) label = 'French';
                else if (urlPath.includes('ger') || urlPath.includes('german')) label = 'German';
                else if (urlPath.includes('ita') || urlPath.includes('italian')) label = 'Italian';
                else if (urlPath.includes('por') || urlPath.includes('portuguese')) label = 'Portuguese';
                else if (urlPath.includes('ara') || urlPath.includes('arabic')) label = 'Arabic';
                else if (urlPath.includes('hin') || urlPath.includes('hindi')) label = 'Hindi';
                else if (urlPath.includes('chi') || urlPath.includes('chinese')) label = 'Chinese';
                else if (urlPath.includes('jpn') || urlPath.includes('japanese')) label = 'Japanese';
                else if (urlPath.includes('kor') || urlPath.includes('korean')) label = 'Korean';
                else {
                    // If still unknown, label them by number
                    label = `Subtitle ${index + 1}`;
                }
            } else {
                // Check if existing label contains "English"
                isEnglish = label.toLowerCase().includes('eng') || label.toLowerCase().includes('english');
            }
            
            return {
                src: sub.file || sub.url,
                label: label,
                kind: sub.kind || 'subtitles',
                default: isEnglish || sub.default || false,
                isEnglish: isEnglish,
            };
        }) || [];
        
        // Filter to only show English subtitles (and keep default if it exists)
        const englishSubtitles = formattedSubtitles.filter(sub => 
            sub.isEnglish || sub.default || sub.label.toLowerCase().includes('eng')
        );
        
        // If we have English subs, use only those; otherwise use all
        const finalSubtitles = englishSubtitles.length > 0 ? englishSubtitles : formattedSubtitles;
        
        // Make labels unique if there are duplicates
        const labelCounts = {};
        const cleanSubtitles = finalSubtitles.map(({ isEnglish: _isEnglish, ...rest }) => {
            const baseLabel = rest.label;
            
            // Track label count and add number suffix for duplicates
            if (labelCounts[baseLabel]) {
                labelCounts[baseLabel]++;
                return { ...rest, label: `${baseLabel} ${labelCounts[baseLabel]}` };
            } else {
                labelCounts[baseLabel] = 1;
                return rest;
            }
        });
        
        logger.log(`[FlixHQ] Formatted subtitles:`, cleanSubtitles);
        logger.log(`[FlixHQ] Subtitle count:`, cleanSubtitles.length);
        
        // Return in standard format for Vidstack player
        return {
            sources: formattedSources,
            subtitles: cleanSubtitles,
            tracks: cleanSubtitles,
            headers: result.headers,
        };
    } catch (error) {
        logger.error("[FlixHQ] Error fetching sources:", error.message);
        return null;
    }
}

export async function getHiAnimeSources(episodeId, version = 'sub', server = 'hd-2') {
    try {
        const API_URL = process.env.FLIXHQ_API_URL; // Same base URL as FlixHQ
        if (!API_URL || !episodeId) {
            logger.log("[HiAnime] API URL not configured or episodeId missing");
            return null;
        }

        logger.log(`[HiAnime] Fetching sources for episode: ${episodeId}, version: ${version}, server: ${server}`);
        
        const response = await fetch(`${API_URL}/api/hianime/sources/${episodeId}?version=${version}&server=${server}`);
        
        if (!response.ok) {
            logger.error(`[HiAnime] Error fetching sources: ${response.status} ${response.statusText}`);
            return null;
        }

        const result = await response.json();
        logger.log(`[HiAnime] Raw response:`, result);
        logger.log(`[HiAnime] Found ${result?.data?.sources?.length || 0} sources`);
        
        // Format sources for Vidstack player with proxy support
        const PROXY_URI = process.env.NEXT_PUBLIC_PROXY_URI;
        logger.log(`[HiAnime] Proxy URI:`, PROXY_URI);
        
        const formattedSources = result.data?.sources?.map(source => {
            // Use proxy for m3u8 URLs to avoid CORS
            const url = PROXY_URI && source.isM3u8
                ? `${PROXY_URI}${encodeURIComponent(source.url)}`
                : source.url;
            logger.log(`[HiAnime] Original:`, source.url);
            logger.log(`[HiAnime] Proxied:`, url);
            return {
                url: url,
                quality: source.quality || 'auto',
                type: source.isM3u8 ? 'hls' : 'video'
            };
        }) || [];
        
        logger.log(`[HiAnime] Formatted sources for Vidstack:`, formattedSources);
        
        // Format subtitles for Vidstack
        const formattedSubtitles = result.data?.subtitles?.map(sub => ({
            file: sub.file || sub.url,
            url: sub.file || sub.url,
            label: sub.label || sub.lang,
            lang: sub.label || sub.lang,
            kind: sub.kind || 'subtitles',
            default: sub.default || false
        })) || [];
        
        logger.log(`[HiAnime] Formatted subtitles:`, formattedSubtitles);
        
        // Return in standard format for Vidstack player
        return {
            sources: formattedSources,
            subtitles: formattedSubtitles,
            tracks: formattedSubtitles,
            intro: result.data?.intro,
            outro: result.data?.outro,
            headers: result.headers,
        };
    } catch (error) {
        logger.error("[HiAnime] Error fetching sources:", error.message);
        return null;
    }
}

export async function getMegaPlaySources(episodeId) {
    try {
        if (!episodeId) {
            logger.log("[MegaPlay] episodeId missing");
            return null;
        }

        logger.log(`[MegaPlay] Processing HiAnime episodeId: ${episodeId}`);
        
        // Extract the number after "episode-" from HiAnime's episodeId
        // Example: "bleach-thousand-year-blood-war-the-conflict-19322-episode-128444" -> "128444"
        const episodeMatch = episodeId.match(/episode-(\d+)$/i);
        
        if (!episodeMatch || !episodeMatch[1]) {
            logger.error(`[MegaPlay] Could not extract episode number from: ${episodeId}`);
            return null;
        }
        
        const episodeNumber = episodeMatch[1];
        logger.log(`[MegaPlay] Extracted episode number: ${episodeNumber}`);
        
        // Construct MegaPlay iframe URL
        // Format: https://megaplay.buzz/stream/s-2/{episodeNumber}/sub
        const iframeUrl = `https://megaplay.buzz/stream/s-2/${episodeNumber}/sub`;
        logger.log(`[MegaPlay] Generated iframe URL: ${iframeUrl}`);
        
        // Return in iframe format (similar to AnimePahe)
        return {
            sources: [{
                url: iframeUrl,
                type: 'iframe'
            }],
            subtitles: [],
            tracks: []
        };
    } catch (error) {
        logger.error("[MegaPlay] Error generating sources:", error.message);
        return null;
    }
}

export async function searchFlixHQ(query) {
    try {
        const API_URL = process.env.FLIXHQ_API_URL;
        if (!API_URL || !query) {
            logger.log("[FlixHQ Search] API URL not configured or query missing");
            return null;
        }

        logger.log(`[FlixHQ Search] Searching for: ${query}`);
        
        const response = await fetch(`${API_URL}/api/flixhq/media/search?q=${encodeURIComponent(query)}&page=1`);
        
        if (!response.ok) {
            logger.error(`[FlixHQ Search] Error: ${response.status} ${response.statusText}`);
            return null;
        }

        const result = await response.json();
        logger.log(`[FlixHQ Search] Found ${result?.data?.length || 0} results`);
        
        // Log first result to see structure
        if (result?.data?.length > 0) {
            logger.log(`[FlixHQ Search] Sample result structure:`, JSON.stringify(result.data[0], null, 2));
        }
        
        return result.data || [];
    } catch (error) {
        logger.error("[FlixHQ Search] Error:", error.message);
        return null;
    }
}

export async function getFlixHQMediaInfo(mediaId) {
    try {
        const API_URL = process.env.FLIXHQ_API_URL;
        if (!API_URL || !mediaId) {
            logger.log("[FlixHQ Info] API URL not configured or mediaId missing");
            return null;
        }

        logger.log(`[FlixHQ Info] Fetching info for: ${mediaId}`);
        
        const response = await fetch(`${API_URL}/api/flixhq/media/${mediaId}`);
        
        if (!response.ok) {
            logger.error(`[FlixHQ Info] Error: ${response.status} ${response.statusText}`);
            return null;
        }

        const result = await response.json();
        logger.log(`[FlixHQ Info] Full API response:`, JSON.stringify(result, null, 2));
        
        // Episodes are at root level, not inside data!
        const mediaData = {
            ...result.data,
            providerEpisodes: result.providerEpisodes || [],
            recommended: result.recommended || []
        };
        
        logger.log(`[FlixHQ Info] Got media info:`, mediaData);
        logger.log(`[FlixHQ Info] Media type:`, mediaData?.type);
        logger.log(`[FlixHQ Info] Provider episodes:`, mediaData?.providerEpisodes?.length || 0);
        if (mediaData?.providerEpisodes) {
            logger.log(`[FlixHQ Info] Sample episodes:`, mediaData.providerEpisodes.slice(0, 3));
        }
        
        return mediaData || null;
    } catch (error) {
        logger.error("[FlixHQ Info] Error:", error.message);
        return null;
    }
}

export async function getAnimeSources(id, provider, epid, epnum, subtype, animeSession = null) {
    try {
        logger.log(`[getAnimeSources] Called with provider: ${provider}, animeSession: ${animeSession}, epid: ${epid}`);
        
        // AnimePahe and Kaido providers
        if (provider === "animepahe") {
            // epid is the episode session, we need the anime session too
            // The anime session should be passed from the episode data
            logger.log(`[getAnimeSources] Calling getAnimePaheSources with animeSession: ${animeSession}, epid: ${epid}`);
            const data = await getAnimePaheSources(animeSession, epid);
            logger.log(`[getAnimeSources] getAnimePaheSources returned:`, data);
            return data;
        }
        
        if (provider === "flixhq") {
            // epid is the episode ID
            logger.log(`[getAnimeSources] Calling getFlixHQSources with epid: ${epid}`);
            const data = await getFlixHQSources(epid);
            logger.log(`[getAnimeSources] getFlixHQSources returned:`, data);
            return data;
        }

        if (provider === "hianime") {
            // epid is the episode ID, subtype is sub/dub
            logger.log(`[getAnimeSources] Calling getHiAnimeSources with epid: ${epid}, subtype: ${subtype}`);
            const data = await getHiAnimeSources(epid, subtype);
            logger.log(`[getAnimeSources] getHiAnimeSources returned:`, data);
            return data;
        }

        if (provider === "megaplay") {
            // epid is the HiAnime episode ID (we extract the number from it)
            logger.log(`[getAnimeSources] Calling getMegaPlaySources with epid: ${epid}`);
            const data = await getMegaPlaySources(epid);
            logger.log(`[getAnimeSources] getMegaPlaySources returned:`, data);
            return data;
        }

        logger.log(`[Sources] Unknown provider: ${provider}`);
        return null;
    } catch (error) {
        logger.log(error);
        return null;
    }
}
