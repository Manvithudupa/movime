// Verified working embed providers (checked August 2026).
// Domains that no longer respond (RiveStream, VidLink, 2Embed, 123Embed,
// VidSrcPM, VidSrcDEV, VidStreamPro) are excluded, as are dead or premium
// sources — see the commented-out section at the bottom.
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
        id: 'moviesapi',
        name: 'MoviesAPI',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://moviesapi.club/movie/{id}',
            tv: 'https://moviesapi.club/tv/{id}-{season}-{episode}'
        }
    },
    {
        id: 'GoDrive',
        name: 'GoDrive',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://godriveplayer.com/player.php?imdb={id}',
            tv: 'https://godriveplayer.com/player.php?type=series&tmdb={id}&season={season}&episode={episode}'
        }
    },
    {
        id: 'embedsu',
        name: 'EmbedSU',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://embed.su/embed/movie/{id}',
            tv: 'https://embed.su/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'hexa',
        name: 'Hexa',
        isFrench: false,
        requiresNoSandbox: false,
        playerType: 'embed',
        urls: {
            movie: 'https://hexa.watch/watch/movie/{id}',
            tv: 'https://hexa.watch/watch/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrcXyz',
        name: 'VidSrcXyz',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidsrc.xyz/embed/movie/{id}',
            tv: 'https://vidsrc.xyz/embed/tv/{id}/{season}/{episode}'
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
        id: 'vidsrcvip',
        name: 'VidSrcVIP',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidsrc.vip/embed/movie/{id}',
            tv: 'https://vidsrc.vip/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrccc',
        name: 'VidSrcCC',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidsrc.cc/v2/embed/movie/{id}?autoPlay=false',
            tv: 'https://vidsrc.cc/v2/embed/tv/{id}/{season}/{episode}?autoPlay=false'
        }
    },
    {
        id: 'smashystream',
        name: 'SmashyStream',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://player.smashy.stream/movie/{id}',
            tv: 'https://player.smashy.stream/tv/{id}?s={season}&e={episode}'
        }
    },
    {
        id: 'autoembed',
        name: 'AutoEmbed',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://player.autoembed.cc/embed/movie/{id}',
            tv: 'https://player.autoembed.cc/embed/tv/{id}/{season}/{episode}'
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
        id: 'vidify',
        name: 'Vidify',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidify.top/embed/movie/{id}',
            tv: 'https://vidify.top/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'flicky',
        name: 'Flicky',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // file-1 domain (flicky.host) kept as verified
            movie: 'https://flicky.host/embed/movie/{id}',
            tv: 'https://flicky.host/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidora',
        name: 'Vidora',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            movie: 'https://vidora.su/movie/{id}',
            tv: 'https://vidora.su/tv/{id}/{season}/{episode}'
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
        id: 'streamflix',
        name: 'StreamFlix',
        isFrench: false,
        requiresNoSandbox: false,
        playerType: 'embed',
        urls: {
            // fixed stray `}` typos from file-2
            movie: 'https://watch.streamflix.one/movie/{id}/watch?server=1',
            tv: 'https://watch.streamflix.one/tv/{id}/watch?server=1&season={season}&episode={episode}'
        }
    },
    {
        id: 'vidjoy',
        name: 'VidJoy',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // fixed stray `}` typo in tv URL from file-2
            movie: 'https://vidjoy.pro/embed/movie/{id}',
            tv: 'https://vidjoy.pro/embed/tv/{id}/{season}/{episode}'
        }
    },

    // ── French ────────────────────────────────────────────────────────────
    {
        id: 'frembed',
        name: 'Frembed',
        isFrench: true,
        requiresNoSandbox: false,
        playerType: 'embed',
        urls: {
            movie: 'https://frembed.cc/api/film.php?id={id}',
            tv: 'https://frembed.cc/api/serie.php?id={id}&sa={season}&epi={episode}'
        }
    }

    // ── Commented out (dead / premium / untested) ─────────────────────────
    // { id: 'pstream',   name: 'P-Stream',          ... }  // domain unresponsive
    // { id: 'spenflix',  name: 'Spenflix',           ... }  // domain unresponsive
    // { id: 'uembed',    name: 'UEmbed (premium)',   ... }  // requires paid API key
];