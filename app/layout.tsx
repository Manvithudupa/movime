import type { Metadata, Viewport } from 'next'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import MotionProvider from '@/components/MotionProvider'
import LoadingBar from '@/components/LoadingBar'
import { Toaster } from '@/components/Toaster'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import LazyAnnouncementPopup from '@/components/LazyAnnouncementPopup'

const SITE_URL = 'https://movime.vercel.app'
const SITE_DESCRIPTION =
  'Watch movies, TV shows, and anime online for free on Movime. Stream trending titles in HD with no signup — browse and start watching instantly.'

// Declared via the viewport export (rather than a manual <meta> tag) so
// Next.js injects exactly one viewport meta instead of duplicating its own
// default alongside a hand-written one.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Movime - Watch Movies, TV Shows & Anime Free',
    template: '%s',
  },
  description: SITE_DESCRIPTION,
  keywords:
    'free movies, free streaming, watch movies online, free tv shows, streaming service, watch movies free, online streaming, movime stream, free movies online, free series online',
  applicationName: 'Movime',
  authors: [{ name: 'Manvith Udupa', url: 'https://github.com/Manvithudupa' }],
  creator: 'Manvith Udupa',
  openGraph: {
    type: 'website',
    siteName: 'Movime',
    title: 'Movime - Watch Movies, TV Shows & Anime Free',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/logo.png`,
        width: 300,
        height: 300,
        alt: 'Movime',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Movime - Watch Movies, TV Shows & Anime Free',
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/logo.png`],
  },
  icons: {
    icon: '/logo.png',
  },
  alternates: {
    canonical: SITE_URL,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA manifest and icons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&display=swap"
          rel="stylesheet"
        />
      </head>

      <body>
        {/* First focusable element on the page — lets keyboard users bypass
            the navbar and land directly on the page content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
        >
          Skip to main content
        </a>

        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                const isLocalhost =
                  location.hostname === 'localhost' ||
                  location.hostname === '127.0.0.1';

                const isHttps = location.protocol === 'https:';

                if (!isLocalhost && !isHttps) return;

                navigator.serviceWorker
                  .register('/sw.js?v=' + new Date().getTime())
                  .then(function(reg) {
                    console.log('Service worker registered.', reg);
                  })
                  .catch(function(err) {
                    console.warn('Service worker registration failed:', err);
                  });
              });
            }
          `}
        </Script>

        <LoadingBar />
        <Toaster />

        <AuthProvider>
          <MotionProvider>
            {children}
            <LazyAnnouncementPopup />
          </MotionProvider>
        </AuthProvider>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
