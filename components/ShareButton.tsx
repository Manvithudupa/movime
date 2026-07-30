'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ShareButtonProps {
  /** Title to use when sharing */
  title?: string
  /** Optional text description */
  text?: string
  /** URL to share (defaults to current page URL) */
  url?: string
  /** Visual variant */
  variant?: 'icon' | 'full'
  /** Optional className override */
  className?: string
}

export default function ShareButton({
  title = 'Movime',
  text,
  url,
  variant = 'icon',
  className = '',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleShare = useCallback(async () => {
    const shareUrl = url || window.location.href
    const shareData = {
      title,
      text: text || `Check this out on Movime`,
      url: shareUrl,
    }

    // Try Web Share API first (works on mobile + some desktops)
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(shareData)
        return
      } catch (err: unknown) {
        // User cancelled or API failed — fall through to clipboard
        if (err.name !== 'AbortError') {
          console.warn('Share API failed:', err)
        } else {
          return // User cancelled, do nothing
        }
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
        setTimeout(() => setCopied(false), 200)
      }, 2000)
    } catch {
      // Final fallback: execCommand
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
        setTimeout(() => setCopied(false), 200)
      }, 2000)
    }
  }, [title, text, url])

  if (variant === 'full') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={handleShare}
          aria-label="Share this content"
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 rounded-sm font-semibold text-xs sm:text-sm tracking-wide transition-all border border-white/20 hover:border-white/40"
        >
          <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {copied ? 'COPIED!' : 'SHARE'}
        </button>

        {/* Toast notification */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-xs text-white shadow-xl z-50"
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Link copied to clipboard!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Icon variant
  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        onClick={handleShare}
        className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 group"
        title="Share"
        aria-label="Share this content"
      >
        <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[10px] text-white shadow-xl z-50"
          >
            Link copied!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
