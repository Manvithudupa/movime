'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function LoadingBar() {
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined

    // Wait a short grace period before showing the bar so fast client-side
    // navigations don't flash it on screen.
    const showTimer = setTimeout(() => {
      setLoading(true)
      hideTimer = setTimeout(() => {
        setLoading(false)
      }, 600)
    }, 150)

    return () => {
      clearTimeout(showTimer)
      if (hideTimer) clearTimeout(hideTimer)
      setLoading(false)
    }
  }, [pathname])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5" role="status" aria-label="Loading page">
      <div className="h-full bg-gradient-to-r from-white/60 via-white/90 to-white/60 animate-loading-bar"></div>
    </div>
  )
}
