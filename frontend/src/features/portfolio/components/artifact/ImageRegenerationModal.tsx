/**
 * Image Regeneration Modal (Phase 3)
 *
 * Allows users to regenerate specific images with updated descriptions.
 * Maximum 3 regeneration attempts per image.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { FinalImage, ImageNeed } from '../../types/portfolio';

interface ImageRegenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: FinalImage;
  imageNeed: ImageNeed;
  onRegenerate: (imageId: string, newDescription: string) => Promise<void>;
}

export function ImageRegenerationModal({
  isOpen,
  onClose,
  image,
  imageNeed,
  onRegenerate,
}: ImageRegenerationModalProps) {
  const [description, setDescription] = useState(imageNeed.description);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    if (!description.trim()) {
      setError('Description cannot be empty');
      return;
    }

    setIsRegenerating(true);
    setError(null);

    try {
      await onRegenerate(image.id, description);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setIsRegenerating(false);
    }
  };

  const attemptsRemaining = 3 - (image.generation_attempts || 1);
  const hasAttemptsRemaining = attemptsRemaining > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Regenerate Image
          </DialogTitle>
          <DialogDescription>
            Edit the image description and regenerate.
          </DialogDescription>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>You have</span>
            <Badge variant="outline">{attemptsRemaining} attempts</Badge>
            <span>remaining.</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Image */}
          <div>
            <Label>Current Image</Label>
            <div className="mt-2 aspect-video bg-muted rounded-md overflow-hidden">
              <img
                src={image.url}
                alt={imageNeed.description}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Resolution: {image.resolution.width}x{image.resolution.height} | Size:{' '}
              {Math.round(image.file_size_kb)}KB | Attempts: {image.generation_attempts}
            </p>
          </div>

          {/* No Attempts Remaining Warning */}
          {!hasAttemptsRemaining && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Maximum regeneration attempts reached (3). You cannot regenerate this image further.
              </AlertDescription>
            </Alert>
          )}

          {/* Edit Description */}
          <div>
            <Label htmlFor="description">Image Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the image should show..."
              rows={4}
              className="mt-2"
              disabled={!hasAttemptsRemaining || isRegenerating}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Be specific about what you want to see. Example: "A modern office workspace with a
              laptop showing analytics dashboard, natural lighting, professional photography style"
            </p>
          </div>

          {/* Style Info */}
          <div className="flex items-center gap-2">
            <Label>Style:</Label>
            <Badge variant="secondary">{imageNeed.style}</Badge>
            <Badge variant="secondary">{imageNeed.purpose}</Badge>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRegenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={
              isRegenerating || !description.trim() || !hasAttemptsRemaining
            }
          >
            {isRegenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Image
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
