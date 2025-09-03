import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const imageUrl = searchParams.get('url')
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 })
    }

    // Basic validation
    try {
      new URL(imageUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the image with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FindMyPic/1.0)',
          'Accept': 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.log(`[ProxyImage] Failed to fetch ${imageUrl}: ${response.status}`)
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
      }

      const contentType = response.headers.get('content-type')
      
      // Check if it's actually an image
      if (!contentType || !contentType.startsWith('image/')) {
        console.log(`[ProxyImage] Not an image: ${contentType}`)
        return NextResponse.json({ error: 'Not an image' }, { status: 400 })
      }

      const buffer = await response.arrayBuffer()
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*',
        },
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log(`[ProxyImage] Timeout fetching ${imageUrl}`)
        return NextResponse.json({ error: 'Timeout' }, { status: 408 })
      }
      
      console.log(`[ProxyImage] Error fetching ${imageUrl}:`, fetchError)
      return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
    }

  } catch (error) {
    console.error('[ProxyImage] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}