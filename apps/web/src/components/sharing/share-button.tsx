'use client'

import { useState } from 'react'
import { Share2, Twitter, Facebook, Link, Check, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export interface ShareData {
  title: string
  text: string
  url: string
  hashtags?: string[]
  via?: string
  imageUrl?: string
}

interface ShareButtonProps {
  data: ShareData
  variant?: 'default' | 'icon' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ShareButton({
  data,
  variant = 'default',
  size = 'md',
  className = ''
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const shareToTwitter = () => {
    const twitterUrl = new URL('https://twitter.com/intent/tweet')
    twitterUrl.searchParams.set('text', data.text)
    twitterUrl.searchParams.set('url', data.url)
    if (data.hashtags && data.hashtags.length > 0) {
      twitterUrl.searchParams.set('hashtags', data.hashtags.join(','))
    }
    if (data.via) {
      twitterUrl.searchParams.set('via', data.via)
    }

    window.open(twitterUrl.toString(), '_blank', 'width=550,height=420')
    setIsOpen(false)
    toast.success('Opening Twitter...')
  }

  const shareToFacebook = () => {
    const facebookUrl = new URL('https://www.facebook.com/sharer/sharer.php')
    facebookUrl.searchParams.set('u', data.url)
    facebookUrl.searchParams.set('quote', data.text)

    window.open(facebookUrl.toString(), '_blank', 'width=550,height=420')
    setIsOpen(false)
    toast.success('Opening Facebook...')
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(data.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Link copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const downloadImage = async () => {
    if (!data.imageUrl) {
      toast.error('No image available')
      return
    }

    try {
      const response = await fetch(data.imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${data.title.replace(/\s+/g, '-').toLowerCase()}.png`
      a.click()
      URL.revokeObjectURL(url)
      setIsOpen(false)
      toast.success('Image downloaded!')
    } catch (error) {
      toast.error('Failed to download image')
    }
  }

  const useNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url
        })
        setIsOpen(false)
        toast.success('Shared successfully!')
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          toast.error('Failed to share')
        }
      }
    }
  }

  const renderButton = () => {
    const baseClasses = `inline-flex items-center gap-2 rounded-lg font-medium transition-all ${sizeClasses[size]}`

    if (variant === 'icon') {
      return (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-lg hover:bg-slate-800 transition-colors ${className}`}
          aria-label="Share"
        >
          <Share2 className={iconSizes[size]} />
        </button>
      )
    }

    if (variant === 'minimal') {
      return (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`${baseClasses} text-slate-400 hover:text-white hover:bg-slate-800 ${className}`}
        >
          <Share2 className={iconSizes[size]} />
          <span>Share</span>
        </button>
      )
    }

    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${baseClasses} bg-blue-600 hover:bg-blue-700 text-white ${className}`}
      >
        <Share2 className={iconSizes[size]} />
        <span>Share</span>
      </button>
    )
  }

  return (
    <div className="relative">
      {renderButton()}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Share Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-white">Share</h3>
                <p className="text-xs text-slate-400 mt-1">{data.title}</p>
              </div>

              <div className="p-2">
                {/* Native Share (if available) */}
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={useNativeShare}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
                  >
                    <Share2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-white">Share via...</span>
                  </button>
                )}

                {/* Twitter */}
                <button
                  onClick={shareToTwitter}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  <Twitter className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-white">Share on Twitter</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={shareToFacebook}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  <Facebook className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-white">Share on Facebook</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Link className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-sm text-white">
                    {copied ? 'Link copied!' : 'Copy link'}
                  </span>
                </button>

                {/* Download Image */}
                {data.imageUrl && (
                  <>
                    <div className="my-2 border-t border-slate-700" />
                    <button
                      onClick={downloadImage}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
                    >
                      <Download className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-white">Download image</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

