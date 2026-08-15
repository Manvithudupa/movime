'use client'

import React from 'react'
import Image, { isAllowedImageSrc } from '@/components/ProxyImage'

interface AvatarProps {
  src: string | null | undefined
  alt: string
  size: number
  fallbackText: string
  className?: string
}

export default function Avatar({ src, alt, size, fallbackText, className = '' }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false)
  
  const handleImageError = () => {
    setImageError(true)
  }

  // SECURITY: only render inline raster images, and cap their size so a
  // malicious avatar_url can't force the browser to decode a giant blob.
  // SVG data URLs are rejected (defense in depth — they can't run scripts in
  // an <img>, but there's no legitimate use for them here).
  const isBase64 =
    !!src &&
    /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src) &&
    src.length <= 500_000
  
  // Ensure the avatar is always a perfect circle with exact square dimensions
  const circleStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  }
  
  // SECURITY: reject avatar URLs that point at hosts outside the trusted
  // allowlist (see isAllowedImageHost) — otherwise a user-set avatar_url could
  // turn the site's image proxy into an open relay or load tracking pixels.
  const untrustedUrl =
    !!src && typeof src === 'string' && !src.startsWith('/') && !isBase64 && !isAllowedImageSrc(src)

  if (!src || imageError || untrustedUrl) {
    return (
      <div 
        className={`bg-white/10 flex items-center justify-center text-white font-bold ${className}`}
        style={{ ...circleStyle, fontSize: size * 0.4 }}
      >
        {fallbackText.charAt(0)?.toUpperCase() || 'U'}
      </div>
    )
  }

  if (isBase64) {
    return (
      <div style={circleStyle} className={`${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={handleImageError}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  return (
    <div style={circleStyle} className={`relative ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={handleImageError}
        sizes={`${size}px`}
        style={{ objectFit: 'cover' }}
      />
    </div>
  )
}
