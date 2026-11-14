// Verified working embed providers (re-audited November 14, 2026).
//
// Only sources that rendered a playable movie (TMDB 550) and TV episode
// (TMDB 1399 S1E1) inside a cross-origin iframe are kept. Removed in this
// audit because they no longer work: VidSrcRIP/SBS/ME/NL/PM/SU (dead or
// rotated domains; vidsrc.su has no TV servers), VidEasy (shut down), VidFast
// and CineSrc (stuck loading), P-Stream (CSP frame-ancestors 'self'), and
// Spenflix (its new host serves a bot challenge instead of a player).
// VidSpark was added after verifying both modes. FilmU and VidRift were
// added in the same way during the follow-up pass.
//
// Earlier removals (Aug 2026): MoviesAPI, GoDrive, EmbedSU, Hexa, VidSrcXyz,
// VidSrcVIP, VidSrcCC, SmashyStream, AutoEmbed, Vidify, Flicky, Vidora,
// StreamFlix, VidJoy, Frembed, SuperEmbed, and MultiEmbed.
export const availableSources = [
    // ── Embed providers ───────────────────────────────────────────────────
    {
        id: 'CinemaOS',
        name: 'CinemaOS',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            // .in is the live host (cinemaos.tech is DNS-blocked in some
            // regions). Its own play buttons link to these /watch routes;
            // /player is the legacy embed path.
            movie: 'https://cinemaos.in/watch/movie/{id}',
            tv: 'https://cinemaos.in/watch/tv/{id}?season={season}&episode={episode}'
        }
    },
    {
        id: 'VidNest',
        name: 'VidNest',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // Movie playback needs server=gama; the TV route 404s with that
            // param, so it is left off there.
            movie: 'https://vidnest.fun/movie/{id}?server=gama',
            tv: 'https://vidnest.fun/tv/{id}/{season}/{episode}'
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
        id: 'vidspark',
        name: 'VidSpark',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // verified Nov 2026 (renders a real player for movies and TV)
            movie: 'https://vidspark.to/movie/{id}',
            tv: 'https://vidspark.to/tv/{id}/{season}/{episode}'
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
        id: 'filmu',
        name: 'FilmU',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // verified Nov 2026: movie and episode both render a real <video>
            movie: 'https://embed.filmu.in/movie/{id}',
            tv: 'https://embed.filmu.in/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidrift',
        name: 'VidRift',
        isFrench: false,
        requiresNoSandbox: true,
        playerType: 'embed',
        urls: {
            // verified Nov 2026: both modes play; movie needs autoplay
            movie: 'https://embed.vidrift.net/embed/movie/{id}?autoplay=1',
            tv: 'https://embed.vidrift.net/embed/tv/{id}/{season}/{episode}?autoplay=1'
        }
    },

    // ── Removed in the November 2026 audit ────────────────────────────────
    // VidSrc family, VidEasy, VidFast, CineSrc, P-Stream, and Spenflix — see
    // the header comment for why each was dropped.
];
