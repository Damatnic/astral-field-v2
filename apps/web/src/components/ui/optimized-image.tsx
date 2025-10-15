'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fill?: boolean
  priority?: boolean
  sizes?: string
  quality?: number
  fallbackSrc?: string
  fallbackIcon?: React.ReactNode
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  fill = false,
  priority = false,
  sizes,
  quality = 90,
  fallbackSrc,
  fallbackIcon,
  objectFit = 'cover',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  const handleError = () => {
    setError(true)
    setLoading(false)
    onError?.()
  }

  const handleLoad = () => {
    setLoading(false)
    onLoad?.()
  }

  // If image failed and we have a fallback
  if (error && fallbackSrc) {
    return (
      <Image
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        className={className}
        priority={priority}
        sizes={sizes}
        quality={quality}
        style={{ objectFit }}
        onError={() => setError(true)}
        onLoad={handleLoad}
      />
    )
  }

  // If image failed and no fallback, show icon
  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-800 ${className}`}
        style={{ width, height: height || width }}
      >
        {fallbackIcon || <ImageOff className="w-1/3 h-1/3 text-slate-600" />}
      </div>
    )
  }

  // Normal image rendering
  return (
    <>
      {loading && !priority && (
        <div
          className={`animate-pulse bg-slate-800 ${className}`}
          style={{ width, height: height || width }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        className={className}
        priority={priority}
        sizes={sizes}
        quality={quality}
        style={{ objectFit }}
        onError={handleError}
        onLoad={handleLoad}
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzFhMWExYSIvPgo8L3N2Zz4="
      />
    </>
  )
}

/**
 * Optimized Team Logo Component
 */
interface TeamLogoProps {
  team: string
  size?: number
  className?: string
}

export function TeamLogo({ team, size = 48, className = '' }: TeamLogoProps) {
  // ESPN team logo URLs
  const logoUrl = `https://a.espncdn.com/i/teamlogos/nfl/500/${team}.png`
  const fallbackUrl = `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${team}.png`

  return (
    <OptimizedImage
      src={logoUrl}
      alt={`${team} logo`}
      width={size}
      height={size}
      className={className}
      fallbackSrc={fallbackUrl}
      quality={95}
      priority={size > 64} // Prioritize larger logos
    />
  )
}

/**
 * Optimized Player Avatar Component
 */
interface PlayerAvatarProps {
  playerId?: string
  playerName: string
  size?: number
  className?: string
}

export function PlayerAvatar({ playerId, playerName, size = 48, className = '' }: PlayerAvatarProps) {
  // ESPN player image URL (if available)
  const imageUrl = playerId
    ? `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${playerId}.png&w=${size}&h=${size}`
    : null

  // Fallback to initials
  const initials = playerName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()

  if (!imageUrl) {
    return (
      <div
        className={`rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size / 3 }}
      >
        {initials}
      </div>
    )
  }

  return (
    <OptimizedImage
      src={imageUrl}
      alt={playerName}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      fallbackIcon={
        <div
          className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold w-full h-full"
          style={{ fontSize: size / 3 }}
        >
          {initials}
        </div>
      }
      quality={95}
    />
  )
}
