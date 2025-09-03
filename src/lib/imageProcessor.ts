import sharp from 'sharp'
import crypto from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export class ImageProcessor {
  private static thumbnailDir = join(process.cwd(), 'public', 'thumbnails')

  static async ensureThumbnailDir() {
    try {
      await mkdir(this.thumbnailDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }

  static async downloadAndCreateThumbnail(imageUrl: string): Promise<string | null> {
    try {
      await this.ensureThumbnailDir()
      
      // Create a hash for the URL to use as filename
      const urlHash = crypto.createHash('md5').update(imageUrl).digest('hex')
      const thumbnailPath = join(this.thumbnailDir, `${urlHash}.webp`)
      const thumbnailUrl = `/thumbnails/${urlHash}.webp`

      // Download the image with timeout and retry logic
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      let imageBuffer: ArrayBuffer
      try {
        const response = await fetch(imageUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FindMyPic-ThumbnailBot/1.0)',
            'Accept': 'image/*,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Cache-Control': 'no-cache',
            'Referer': new URL(imageUrl).origin
          }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.log(`[ImageProcessor] Failed to fetch ${imageUrl}: ${response.status}`)
          return null
        }

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.startsWith('image/')) {
          console.log(`[ImageProcessor] Not an image: ${contentType}`)
          return null
        }

        imageBuffer = await response.arrayBuffer()
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.log(`[ImageProcessor] Error downloading ${imageUrl}:`, fetchError)
        return null
      }

      // Process the image with Sharp - create a small thumbnail
      try {
        const processedBuffer = await sharp(Buffer.from(imageBuffer))
          .resize(150, 150, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ 
            quality: 70,
            effort: 4
          })
          .toBuffer()

        // Save the thumbnail
        await writeFile(thumbnailPath, processedBuffer)
        
        console.log(`[ImageProcessor] Created thumbnail: ${thumbnailUrl}`)
        return thumbnailUrl

      } catch (sharpError) {
        console.log(`[ImageProcessor] Error processing image with Sharp:`, sharpError)
        return null
      }

    } catch (error) {
      console.error(`[ImageProcessor] Unexpected error creating thumbnail for ${imageUrl}:`, error)
      return null
    }
  }

  static async createThumbnailsForResults(results: any[]): Promise<any[]> {
    const processedResults = await Promise.all(
      results.map(async (result) => {
        if (!result.thumbnail) {
          return result
        }

        try {
          const thumbnailUrl = await this.downloadAndCreateThumbnail(result.thumbnail)
          return {
            ...result,
            thumbnail: thumbnailUrl || result.thumbnail, // Keep original as fallback
            thumbnailProcessed: !!thumbnailUrl
          }
        } catch (error) {
          console.warn(`[ImageProcessor] Failed to process thumbnail for result ${result.id}`)
          return result
        }
      })
    )

    return processedResults
  }
}