import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { encryptSensitiveData } from '@/lib/encryption'
import { uploadToR2, r2Client } from '@/lib/r2'
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

interface ImageMetadata {
  originalName?: string
  mimeType: string
  size: number
  hash: string
  uploadedBy?: string
  uploadedAt: Date
}

export class ImageStorage {
  private readonly baseStoragePath: string
  private readonly encryptionKey: string

  constructor() {
    this.baseStoragePath = path.join(process.cwd(), 'storage', 'images')
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key'
    this.ensureStorageDirectory()
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(this.baseStoragePath)
    } catch {
      await fs.mkdir(this.baseStoragePath, { recursive: true })
    }
  }

  /**
   * Salva un'immagine in formato base64 nel storage R2
   */
  async saveImage(
    imageData: string, 
    metadata: Partial<ImageMetadata> = {}
  ): Promise<{
    storagePath: string
    imageHash: string
    metadata: ImageMetadata
  }> {
    try {
      // Estrai il buffer dell'immagine dal base64
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      
      // Genera hash dell'immagine
      const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex')
      
      // Determina tipo MIME
      const mimeType = this.detectMimeType(imageData)
      const extension = this.getExtensionFromMime(mimeType)
      
      // Crea nome file sicuro
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const randomSuffix = crypto.randomBytes(8).toString('hex')
      const filename = `images/${timestamp}_${randomSuffix}_${imageHash.substring(0, 16)}.${extension}`
      
      // Metadata completa
      const completeMetadata: ImageMetadata = {
        originalName: metadata.originalName,
        mimeType,
        size: imageBuffer.length,
        hash: imageHash,
        uploadedBy: metadata.uploadedBy,
        uploadedAt: new Date()
      }
      
      // Salva l'immagine su R2
      const publicUrl = await uploadToR2(filename, imageBuffer, mimeType)
      
      // Salva i metadata localmente per ora (potremmo spostarli su R2 in futuro)
      const localMetadataPath = path.join(this.baseStoragePath, filename.replace('images/', '') + '.meta')
      await this.ensureStorageDirectory()
      const encryptedMetadata = encryptSensitiveData(JSON.stringify(completeMetadata))
      await fs.writeFile(localMetadataPath, encryptedMetadata)
      
      console.log(`Image saved to R2: ${filename} (${imageBuffer.length} bytes) -> ${publicUrl}`)
      
      return {
        storagePath: filename, // Restituisce il path R2
        publicUrl, // Aggiungi l'URL pubblico
        imageHash,
        metadata: completeMetadata
      }
      
    } catch (error) {
      console.error('Error saving image to R2:', error)
      throw new Error('Failed to save image to R2 storage')
    }
  }

  /**
   * Recupera un'immagine dal storage R2
   */
  async getImage(storagePath: string): Promise<{
    buffer: Buffer
    metadata: ImageMetadata
  } | null> {
    try {
      // Leggi i metadata locali
      const localMetadataPath = path.join(this.baseStoragePath, storagePath.replace('images/', '') + '.meta')
      const encryptedMetadata = await fs.readFile(localMetadataPath, 'utf8')
      const metadataJson = this.decryptMetadata(encryptedMetadata)
      const metadata = JSON.parse(metadataJson)
      
      // Recupera l'immagine da R2
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: storagePath,
      })
      
      const response = await r2Client.send(command)
      const chunks: Uint8Array[] = []
      
      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk)
        }
      }
      
      const imageBuffer = Buffer.concat(chunks)
      
      return { buffer: imageBuffer, metadata }
      
    } catch (error) {
      console.error('Error retrieving image from R2:', error)
      return null
    }
  }

  /**
   * Rimuove un'immagine dal storage R2
   */
  async deleteImage(storagePath: string): Promise<boolean> {
    try {
      // Elimina l'immagine da R2
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: storagePath,
      })
      
      await r2Client.send(deleteCommand)
      
      // Elimina i metadata locali
      const localMetadataPath = path.join(this.baseStoragePath, storagePath.replace('images/', '') + '.meta')
      await fs.unlink(localMetadataPath)
      
      console.log(`Image deleted from R2: ${storagePath}`)
      return true
      
    } catch (error) {
      console.error('Error deleting image from R2:', error)
      return false
    }
  }

  /**
   * Lista tutte le immagini nel storage
   */
  async listImages(): Promise<{
    storagePath: string
    metadata: ImageMetadata
  }[]> {
    try {
      const files = await fs.readdir(this.baseStoragePath)
      const imageFiles = files.filter(file => !file.endsWith('.meta'))
      
      const images = []
      for (const filename of imageFiles) {
        try {
          const result = await this.getImage(filename)
          if (result) {
            images.push({
              storagePath: filename,
              metadata: result.metadata
            })
          }
        } catch (error) {
          console.warn(`Could not read metadata for ${filename}:`, error)
        }
      }
      
      return images
      
    } catch (error) {
      console.error('Error listing images:', error)
      return []
    }
  }

  /**
   * Pulisce immagini vecchie basate su retention policy
   */
  async cleanupOldImages(retentionDays: number = 180): Promise<number> {
    try {
      const images = await this.listImages()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      
      let deletedCount = 0
      
      for (const image of images) {
        if (image.metadata.uploadedAt < cutoffDate) {
          const deleted = await this.deleteImage(image.storagePath)
          if (deleted) deletedCount++
        }
      }
      
      console.log(`Cleanup completed: ${deletedCount} images deleted`)
      return deletedCount
      
    } catch (error) {
      console.error('Error during cleanup:', error)
      return 0
    }
  }

  private detectMimeType(imageData: string): string {
    const mimeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/)
    return mimeMatch ? mimeMatch[1] : 'image/jpeg'
  }

  private getExtensionFromMime(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg': return 'jpg'
      case 'image/png': return 'png'
      case 'image/gif': return 'gif'
      case 'image/webp': return 'webp'
      case 'image/bmp': return 'bmp'
      default: return 'jpg'
    }
  }

  private decryptMetadata(encryptedData: string): string {
    // Per ora usa la stessa funzione di decryption
    // In futuro potresti volere una funzione specifica
    try {
      const crypto = require('crypto')
      const algorithm = 'aes-256-cbc'
      const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32))
      
      const [ivHex, encryptedHex] = encryptedData.split(':')
      const iv = Buffer.from(ivHex, 'hex')
      const encrypted = Buffer.from(encryptedHex, 'hex')
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv)
      let decrypted = decipher.update(encrypted, null, 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Error decrypting metadata:', error)
      throw new Error('Failed to decrypt metadata')
    }
  }
}

// Singleton instance
export const imageStorage = new ImageStorage()