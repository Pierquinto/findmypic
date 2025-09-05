'use client'

import { useState, useEffect } from 'react'
import { Globe, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth/client'

interface ThumbnailImageProps {
  src: string
  alt: string
  className?: string
  siteName?: string
}

export default function ThumbnailImage({ 
  src, 
  alt, 
  className = '',
  siteName 
}: ThumbnailImageProps) {
  const { apiRequest } = useAuth()
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [cleanSrc, setCleanSrc] = useState('')
  const [hasTriedProxy, setHasTriedProxy] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  const fetchAuthenticatedImage = async (imageUrl: string) => {
    try {
      console.log('ThumbnailImage fetching authenticated image via token:', imageUrl)
      
      // Extract search ID from the URL
      const searchId = imageUrl.match(/\/api\/(?:search-images|proxy-search-image)\/([^/]+)/)?.[1]
      if (!searchId) {
        console.error('Could not extract search ID from URL:', imageUrl)
        setImageState('error')
        return
      }
      
      // Get a token for the image
      const tokenResponse = await apiRequest(`/api/image-token/${searchId}`, {
        credentials: 'include'
      })
      
      if (!tokenResponse.ok) {
        console.error('Failed to get image token:', tokenResponse.status, await tokenResponse.text())
        setImageState('error')
        return
      }
      
      const { imageUrl: publicImageUrl } = await tokenResponse.json()
      console.log('Got public image URL:', publicImageUrl)
      
      // Now load the image using the public URL
      setCleanSrc(publicImageUrl)
      setImageState('loading')
      
    } catch (error) {
      console.error('ThumbnailImage error fetching authenticated image:', error)
      setImageState('error')
    }
  }

  useEffect(() => {
    if (!src) {
      setImageState('error')
      return
    }

    // Reset state when src changes
    setHasTriedProxy(false)
    
    // Check if it's an authenticated API endpoint
    const isAuthenticatedEndpoint = src && (src.startsWith('/api/search-images/') || src.startsWith('/api/proxy-search-image/'))
    
    // Check if it's an external URL that might need proxying
    const isExternalImage = src && (src.startsWith('http://') || src.startsWith('https://'))
    const isFromSocialPlatform = isExternalImage && (
      src.includes('facebook.com') ||
      src.includes('instagram.com') ||
      src.includes('tiktok.com') ||
      src.includes('twitter.com') ||
      src.includes('x.com') ||
      src.includes('linkedin.com') ||
      src.includes('pinterest.com') ||
      src.includes('snapchat.com')
    )

    if (isAuthenticatedEndpoint) {
      // For authenticated endpoints, try direct loading first
      // The browser will include cookies automatically
      setCleanSrc(src)
      console.log('ThumbnailImage trying direct loading for authenticated endpoint:', src)
    } else if (isFromSocialPlatform) {
      // Use proxy immediately for known social media platforms
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`
      setCleanSrc(proxyUrl)
      setHasTriedProxy(true)
      console.log('ThumbnailImage using proxy for social media:', src)
    } else {
      // Try direct loading first for other images
      setCleanSrc(src)
      console.log('ThumbnailImage direct loading:', src)
    }
    
    setImageState('loading')
  }, [src])

  const handleError = () => {
    console.log('ThumbnailImage error loading:', cleanSrc)
    
    // If this is an authenticated endpoint and direct loading failed, try fetch
    if (src && (src.startsWith('/api/search-images/') || src.startsWith('/api/proxy-search-image/')) && !hasTriedProxy) {
      console.log('ThumbnailImage direct loading failed, trying fetch for authenticated endpoint:', src)
      setHasTriedProxy(true)
      fetchAuthenticatedImage(src)
      return
    }
    
    // If direct loading failed and we haven't tried proxy yet, try proxy as fallback
    if (!hasTriedProxy && src && (src.startsWith('http://') || src.startsWith('https://'))) {
      console.log('ThumbnailImage trying proxy fallback for:', src)
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`
      setCleanSrc(proxyUrl)
      setHasTriedProxy(true)
      setImageState('loading')
      return
    }
    
    // If we've tried everything, show fallback
    setImageState('error')
  }

  const handleLoad = () => {
    console.log('ThumbnailImage loaded successfully:', cleanSrc) // Debug log
    setImageState('loaded')
  }

  // Show fallback immediately if no valid source
  if (!cleanSrc || imageState === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto mb-2 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Globe className="h-6 w-6 text-gray-400" />
          </div>
          <h4 className="text-xs font-semibold text-gray-700 mb-1 leading-tight max-w-full truncate">
            {siteName || 'Immagine Ricerca'}
          </h4>
          <p className="text-xs text-gray-500">
            {(src && (src.startsWith('/api/search-images/') || src.startsWith('/api/proxy-search-image/'))) ? 'Caricamento...' : 'Anteprima non disponibile'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {imageState === 'loading' && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={cleanSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}