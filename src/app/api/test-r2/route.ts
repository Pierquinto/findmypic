import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/r2'

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