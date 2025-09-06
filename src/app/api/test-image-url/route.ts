import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
    }
    
    console.log('Testing image URL:', imageUrl)
    
    // Try to fetch the image
    const response = await fetch(imageUrl, {
      method: 'HEAD', // Solo headers, non scaricare l'intera immagine
    })
    
    console.log('Image URL test result:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })
    
    return NextResponse.json({
      url: imageUrl,
      accessible: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      corsHeaders: {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods')
      }
    })
    
  } catch (error) {
    console.error('Image URL test error:', error)
    return NextResponse.json({
      error: 'Failed to test URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}