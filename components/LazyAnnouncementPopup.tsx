'use client'

import dynamic from 'next/dynamic'

// The announcement modal is non-critical UI, so it is loaded with next/dynamic
// (ssr: false) instead of being bundled into the initial JS of every route.
// It now only downloads once the page is interactive.
const AnnouncementPopup = dynamic(() => import('@/components/AnnouncementPopup'), {
  ssr: false,
})

export default function LazyAnnouncementPopup() {
  return <AnnouncementPopup />
}
