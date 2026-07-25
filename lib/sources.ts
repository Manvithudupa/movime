export const availableSources = [
    {
        id: 'CinemaOS',
        name: 'CinemaOS',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://cinemaos.tech/movie/watch/{id}',
            tv: 'https://cinemaos.tech/tv/watch/{id}/{season}/{episode}'
        }
    },
    {
        id: 'VidNest',
        name: 'VidNest',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://vidnest.fun/movie/{id}?server=gama',
            tv: 'https://vidnest.fun/tv/{id}/{season}/{episode}?server=gama'
        }
    },
    {
        id: 'MappleTV',
        name: 'MappleTV',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://mapple.rip/watch/movie/{id}?autoPlay=true&theme=#9900ff',
            tv: 'https://mapple.rip/watch/tv/{id}-{season}-{episode}?nextButton=true&autoPlay=true&theme=#9900ff'
        }
    },
    {
        id: 'SuperEmbed',
        name: 'SuperEmbed',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://multiembed.mov/directstream.php?video_id={id}&tmdb=1',
            tv: 'https://multiembed.mov/directstream.php?video_id={id}&tmdb=1&s={season}&e={episode}'
        }
    },
    {
        id: 'rive',
        name: 'RiveStream',
        isFrench: false,
        urls: {
            movie: 'https://rivestream.ru/embed?type=movie&id={id}',
            tv: 'https://rivestream.ru/embed?type=tv&id={id}&season={season}&episode={episode}'
        }
    },
    {
        id: 'AutoEmbed',
        name: 'AutoEmbed',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://autoembed.co/movie/tmdb/{id}',
            tv: 'https://autoembed.co/tv/tmdb/{id}-{season}-{episode}'
        }
    },
    {
        id: 'vidlink',
        name: 'VidLink',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://vidlink.pro/movie/{id}',
            tv: 'https://vidlink.pro/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrcsu',
        name: 'VidSrcSU',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://vidsrc.su/embed/movie/{id}',
            tv: 'https://vidsrc.su/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: '2embed',
        name: '2Embed',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://www.2embed.cc/embed/{id}',
            tv: 'https://www.2embed.cc/embedtv/{id}&s={season}&e={episode}'
        }
    },
    {
        id: '123embed',
        name: '123Embed',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://play2.123embed.net/movie/{id}',
            tv: 'https://play2.123embed.net/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'videasy',
        name: 'VidEasy (4K)',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://player.videasy.to/movie/{id}?color=8834ec',
            tv: 'https://player.videasy.to/tv/{id}/{season}/{episode}?color=8834ec'
        }
    },
    {
        id: 'vidfast',
        name: 'VidFast (4K)',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://vidfast.vc/movie/{id}',
            tv: 'https://vidfast.vc/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrcsbs',
        name: 'VidSrcSBS',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://vidsrc.sbs/embed/movie/{id}',
            tv: 'https://vidsrc.sbs/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrcrip',
        name: 'VidSrcRIP',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://vidsrc.rip/embed/movie/{id}',
            tv: 'https://vidsrc.rip/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidsrcpm',
        name: 'VidSrcPM',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://vidsrc.pm/embed/movie/{id}',
            tv: 'https://vidsrc.pm/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'viduki',
        name: 'Viduki',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://viduki.net/embed/movie/{id}',
            tv: 'https://viduki.net/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'streamflix',
        name: 'StreamFlix',
        isFrench: false,
        urls: {
            movie: 'https://watch.streamflix.one/movie/{id}/watch?server=1',
            tv: 'https://watch.streamflix.one/tv/{id}/watch?server=1&season={season}&episode={episode}'
        }
    },
    {
        id: 'vidjoy',
        name: 'VidJoy',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://vidjoy.pro/embed/movie/{id}',
            tv: 'https://vidjoy.pro/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidzee',
        name: 'VidZee',
        isFrench: false,
        requiresNoSandbox: true,
        urls: {
            movie: 'https://player.vidzee.wtf/embed/movie/{id}',
            tv: 'https://player.vidzee.wtf/embed/tv/{id}/{season}/{episode}'
        }
    }
];
