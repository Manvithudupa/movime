import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import MotionProvider from '@/components/MotionProvider'
import LoadingBar from '@/components/LoadingBar'
import { Toaster } from '@/components/Toaster'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import AnnouncementPopup from '@/components/AnnouncementPopup'

const SITE_URL = 'https://movime.vercel.app'
const SITE_DESCRIPTION =
  'Watch movies, TV shows, and anime online for free on Movime. Stream trending titles in HD with no signup — browse and start watching instantly.'

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
  authors: [{ name: 'Manvith Udupa', url: 'https://github.com/Manvith911' }],
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />

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
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>

      <body>
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
                  .register('/sw.js')
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
            <AnnouncementPopup />
          </MotionProvider>
        </AuthProvider>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
