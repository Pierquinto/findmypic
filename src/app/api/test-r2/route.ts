import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2, r2Client } from '@/lib/r2'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test R2 connection by listing objects
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      MaxKeys: 5
    })
    
    const response = await r2Client.send(command)
    
    // Controlla anche cosa c'è nel database
    const recentSearches = await prisma.search.findMany({
      where: {
        imageUrl: { not: null }
      },
      select: {
        id: true,
        imageUrl: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    })
    
    return NextResponse.json({ 
      success: true,
      bucket: process.env.R2_BUCKET_NAME,
      r2_public_url: process.env.R2_PUBLIC_URL, // Aggiungi per debug
      objects: response.Contents?.length || 0,
      sample: response.Contents?.slice(0, 3).map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        // Costruisci l'URL completo per vedere se è corretto
        fullUrl: `${process.env.R2_PUBLIC_URL}/${obj.Key}`
      })) || [],
      database_samples: recentSearches
    })
    
  } catch (error) {
    console.error('R2 connection test error:', error)
    return NextResponse.json({ 
      error: 'R2 connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Generate unique filename
    const filename = `test-${Date.now()}-${file.name}`
    
    // Upload to R2
    const url = await uploadToR2(filename, buffer, file.type)
    
    return NextResponse.json({ 
      success: true, 
      url,
      filename,
      size: buffer.length,
      type: file.type
    })
    
  } catch (error) {
    console.error('R2 upload error:', error)
    return NextResponse.json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}