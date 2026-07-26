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
  
  if (!src || imageError) {
    return (
      <div 
        className={`bg-white/10 rounded-full flex items-center justify-center text-white font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackText.charAt(0)?.toUpperCase() || 'U'}
      </div>
    )
  }

  if (isBase64) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        onError={handleImageError}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={handleImageError}
      unoptimized={!!isBase64}
    />
  )
}
