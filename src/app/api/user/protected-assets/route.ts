import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import crypto from 'crypto'
import { createDataHash } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Fetch protected assets
    const assets = await prisma.protectedAsset.findMany({
      where: { userId },
      include: {
        monitoringResults: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate stats
    const stats = {
      totalAssets: assets.length,
      activeMonitoring: assets.filter(a => a.monitoringEnabled).length,
      totalViolations: assets.reduce((sum, asset) => sum + asset.totalViolations, 0),
      violationsThisMonth: assets.reduce((sum, asset) => {
        const thisMonth = asset.monitoringResults.filter(result => {
          const resultDate = new Date(result.createdAt)
          const now = new Date()
          return resultDate.getMonth() === now.getMonth() && 
                 resultDate.getFullYear() === now.getFullYear()
        })
        return sum + thisMonth.reduce((monthSum, result) => monthSum + result.newViolations, 0)
      }, 0)
    }

    // Format assets for frontend
    const formattedAssets = assets.map(asset => ({
      id: asset.id,
      name: asset.name,
      description: asset.description,
      imageUrl: asset.imageUrl,
      tags: asset.tags ? (Array.isArray(asset.tags) ? asset.tags : JSON.parse(asset.tags as string)) : [],
      monitoringEnabled: asset.monitoringEnabled,
      monitoringFrequency: asset.monitoringFrequency,
      lastMonitoredAt: asset.lastMonitoredAt?.toISOString(),
      totalViolations: asset.totalViolations,
      status: asset.status,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
      monitoringResults: asset.monitoringResults.map(result => ({
        id: result.id,
        monitoringDate: result.monitoringDate.toISOString(),
        violationsFound: result.violationsFound,
        newViolations: result.newViolations,
        resolvedViolations: result.resolvedViolations,
        status: result.status
      }))
    }))

    return NextResponse.json({
      assets: formattedAssets,
      stats
    })

  } catch (error) {
    console.error('Error fetching protected assets:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = user.id
    const formData = await req.formData()
    
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string || ''
    const tagsString = formData.get('tags') as string || ''
    const monitoringFrequency = formData.get('monitoringFrequency') as string || 'weekly'

    if (!file || !name.trim()) {
      return NextResponse.json(
        { error: 'File e nome sono richiesti' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'protected-assets')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`
    const filePath = join(uploadsDir, uniqueFilename)
    const publicUrl = `/uploads/protected-assets/${uniqueFilename}`

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Generate image hash for deduplication
    const imageHash = createDataHash(buffer.toString('base64'))

    // Parse tags
    const tags = tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    // Create protected asset record
    const asset = await prisma.protectedAsset.create({
      data: {
        userId,
        name: name.trim(),
        description: description.trim() || null,
        imageUrl: publicUrl,
        imageHash,
        tags: JSON.stringify(tags),
        monitoringEnabled: true,
        monitoringFrequency,
        status: 'active'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Asset aggiunto con successo',
      assetId: asset.id
    })

  } catch (error) {
    console.error('Error creating protected asset:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione dell\'asset' },
      { status: 500 }
    )
  }
}