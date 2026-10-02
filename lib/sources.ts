// Verified working embed providers (re-verified August 2026).
// Domains that no longer respond (RiveStream, 2Embed, 123Embed, VidSrcDEV,
// VidStreamPro) are excluded, as are dead or premium sources — see the
// commented-out section at the bottom. VidLink (vidlink.pro) and VidSrcPM
// (vidsrc.pm), once listed here as dead, were later re-added below.
//
// Dead as of the August 2026 audit (removed): MoviesAPI, GoDrive, EmbedSU,
// Hexa, VidSrcXyz, VidSrcVIP, VidSrcCC, SmashyStream, AutoEmbed, Vidify,
// Flicky, Vidora, StreamFlix, VidJoy, and Frembed.
//
// Removed August 2026 (multiembed.mov now refuses cross-origin iframe
// embedding — Cloudflare challenge sends X-Frame-Options: SAMEORIGIN, so the
// watch page iframe gets "refused to connect"): SuperEmbed and MultiEmbed
// (both multiembed.mov, which redirects to streamingnow.mov).
//
// Added August 2026 (verified rendering real players in a browser):
// VidSrcPM (vidsrc.pm), VidLink (vidlink.pro), and CineSrc (cinesrc.st).
//
// Re-added October 2026 with new domains: P-Stream (pstream.cfd, previously
// iframe.pstream.mov) and Spenflix (spenflix.world, previously
// spencerdevs.xyz) — both were listed as "domain unresponsive" and have since
// come back under new hosts.
export const availableSources = [
    // ── Embed providers ───────────────────────────────────────────────────
    {
        id: 'CinemaOS',
        name: 'CinemaOS',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://cinemaos.tech/player/{id}',
            tv: 'https://cinemaos.tech/player/{id}/{season}/{episode}'
        }
    },
    {
        id: 'VidNest',
        name: 'VidNest',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // file-1 URLs include ?server=gama param (verified)
            movie: 'https://vidnest.fun/movie/{id}?server=gama',
            tv: 'https://vidnest.fun/tv/{id}/{season}/{episode}?server=gama'
        }
    },
    {
        id: 'MappleTV',
        name: 'MappleTV',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // file-1 domain (mapple.rip) kept as verified
            movie: 'https://mapple.rip/watch/movie/{id}?autoPlay=true&theme=#9900ff',
            tv: 'https://mapple.rip/watch/tv/{id}-{season}-{episode}?nextButton=true&autoPlay=true&theme=#9900ff'
        }
    },
    {
        id: 'vidsrcrip',
        name: 'VidSrcRIP',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidsrc.rip/embed/movie/{id}',
            tv: 'https://vidsrc.rip/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrcsu',
        name: 'VidSrcSU',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidsrc.su/embed/movie/{id}',
            tv: 'https://vidsrc.su/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrcsbs',
        name: 'VidSrcSBS',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidsrc.sbs/embed/movie/{id}',
            tv: 'https://vidsrc.sbs/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrcme',
        name: 'VidSrcME',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidsrcme.ru/embed/movie/{id}',
            tv: 'https://vidsrcme.ru/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrcnl',
        name: 'VidSrcNL',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidsrc.nl/embed/movie/{id}',
            tv: 'https://vidsrc.nl/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrcpm',
        name: 'VidSrcPM',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // verified live Aug 2026 (renders a real player iframe)
            movie: 'https://vidsrc.pm/embed/movie/{id}',
            tv: 'https://vidsrc.pm/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidlink',
        name: 'VidLink',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // verified live Aug 2026 (renders a real <video> player)
            movie: 'https://vidlink.pro/movie/{id}',
            tv: 'https://vidlink.pro/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'videasy',
        name: 'VidEasy (4K)',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://player.videasy.net/movie/{id}?color=8834ec',
            tv: 'https://player.videasy.net/tv/{id}/{season}/{episode}?color=8834ec'
        }
    },
    {
        id: 'vidfast',
        name: 'VidFast (4K)',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidfast.pro/movie/{id}',
            tv: 'https://vidfast.pro/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidzee',
        name: 'VidZee',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://player.vidzee.wtf/embed/movie/{id}',
            tv: 'https://player.vidzee.wtf/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'cinesrc',
        name: 'CineSrc',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // verified live Aug 2026 (renders a real <video> player for both
            // movies and TV in a cross-origin iframe; TV uses s/e query params)
            movie: 'https://cinesrc.st/embed/movie/{id}',
            tv: 'https://cinesrc.st/embed/tv/{id}?s={season}&e={episode}'
        }
    },
    {
        id: 'pstream',
        name: 'P-Stream',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // movie-web style media routes (TMDB ids); new host of pstream.mov
            movie: 'https://pstream.cfd/media/tmdb-movie-{id}',
            tv: 'https://pstream.cfd/media/tmdb-tv-{id}/{season}/{episode}'
        }
    },
    {
        id: 'spenflix',
        name: 'Spenflix',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // same paths as the old spencerdevs.xyz host (TMDB ids)
            movie: 'https://spenflix.world/movie/{id}',
            tv: 'https://spenflix.world/tv/{id}/{season}/{episode}'
        }
    },

    // ── Commented out (dead / premium / untested) ─────────────────────────
    // { id: 'uembed',    name: 'UEmbed (premium)',   ... }  // requires paid API key
];
