'use client'

import React from 'react'
import Image from '@/components/ProxyImage'

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

  const isBase64 = src && src.startsWith('data:image')
  
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
  
  if (!src || imageError) {
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
