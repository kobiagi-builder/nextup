/**
 * ImageCropModal Component
 *
 * Modal for cropping images in the rich text editor.
 * Uses react-image-crop for the crop UI and uploads the result to Supabase Storage.
 */

import { useState, useRef, useCallback } from 'react'
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { toast } from '@/hooks/use-toast'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ImageCropModalProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
  artifactId: string
  onCropComplete: (newUrl: string) => void
}

function getCroppedCanvas(
  image: HTMLImageElement,
  crop: PixelCrop,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  canvas.width = Math.floor(crop.width * scaleX)
  canvas.height = Math.floor(crop.height * scaleY)

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return canvas
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
) {
  return centerCrop(
    makeAspectCrop(
      { unit: '%', width: 90 },
      mediaWidth / mediaHeight,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  artifactId,
  onCropComplete,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isUploading, setIsUploading] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height))
  }, [])

  const handleApply = async () => {
    if (!completedCrop || !imgRef.current) return

    if (!UUID_RE.test(artifactId)) {
      logger.error('[ImageCropModal] Invalid artifactId format', {
        hasArtifactId: !!artifactId,
      })
      toast({
        title: 'Upload failed',
        description: 'Invalid artifact ID',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    try {
      const canvas = getCroppedCanvas(imgRef.current, completedCrop)

      // Convert canvas to base64 for backend upload
      const imageData = canvas.toDataURL('image/png')

      const result = await api.post<{ url: string }>(
        `/api/artifacts/${artifactId}/images/crop`,
        { imageData },
      )

      onCropComplete(result.url)
      onClose()
    } catch (error) {
      logger.error('[ImageCropModal] Crop failed', {
        hasCompletedCrop: !!completedCrop,
        hasImgRef: !!imgRef.current,
      })
      toast({
        title: 'Crop failed',
        description: error instanceof Error ? error.message : 'Failed to crop image',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl"
        data-portal-ignore-click-outside
      >
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center max-h-[60vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            keepSelection
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              crossOrigin="anonymous"
              onLoad={onImageLoad}
              className="max-h-[55vh] object-contain"
            />
          </ReactCrop>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!completedCrop || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Apply Crop'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
