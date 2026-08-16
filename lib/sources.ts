// Verified working embed providers (re-verified August 2026).
// Domains that no longer respond (RiveStream, VidLink, 2Embed, 123Embed,
// VidSrcPM, VidSrcDEV, VidStreamPro) are excluded, as are dead or premium
// sources — see the commented-out section at the bottom.
//
// Dead as of the August 2026 audit (removed): MoviesAPI, GoDrive, EmbedSU,
// Hexa, VidSrcXyz, VidSrcVIP, VidSrcCC, SmashyStream, AutoEmbed, Vidify,
// Flicky, Vidora, StreamFlix, VidJoy, and Frembed.
//
// Added August 2026 (verified rendering real players in a browser):
// VidSrcPM (vidsrc.pm) and VidLink (vidlink.pro).
export const availableSources = [
    // ── Embed providers ───────────────────────────────────────────────────
    {
        id: 'CinemaOS',
        name: 'CinemaOS',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // file-1 URLs verified Aug 2026
            movie: 'https://cinemaos.tech/movie/watch/{id}',
            tv: 'https://cinemaos.tech/tv/watch/{id}?season={season}&episode={episode}'
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
        id: 'SuperEmbed',
        name: 'SuperEmbed',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://multiembed.mov/directstream.php?video_id={id}&tmdb=1',
            tv: 'https://multiembed.mov/directstream.php?video_id={id}&tmdb=1&s={season}&e={episode}'
        }
    },
    {
        id: 'multiembed',
        name: 'MultiEmbed',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://multiembed.mov/?video_id={id}&tmdb=1',
            tv: 'https://multiembed.mov/?video_id={id}&tmdb=1&s={season}&e={episode}'
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

    // ── Commented out (dead / premium / untested) ─────────────────────────
    // { id: 'pstream',   name: 'P-Stream',          ... }  // domain unresponsive
    // { id: 'spenflix',  name: 'Spenflix',           ... }  // domain unresponsive
    // { id: 'uembed',    name: 'UEmbed (premium)',   ... }  // requires paid API key
];
