/**
 * Supabase Storage Helpers - Image Upload/Delete
 *
 * Handles image storage operations for Phase 3 (Graphics & Completion).
 *
 * Storage Structure:
 * artifacts/
 *   {artifact_id}/
 *     images/
 *       final/
 *         {image_id}.png  (permanent)
 *       rejected/
 *         {image_id}.png  (debugging, 7-day TTL)
 */

import { getSupabase } from './requestContext.js';
import sharp from 'sharp';

/**
 * Upload final image to Supabase Storage
 *
 * @param artifactId - Artifact UUID
 * @param imageId - Image UUID
 * @param buffer - Image buffer
 * @returns Public URL and storage path
 */
export async function uploadFinalImage(
  artifactId: string,
  imageId: string,
  buffer: Buffer
): Promise<{ url: string; path: string }> {
  // Optimize image with Sharp (compress to < 500KB)
  const optimizedBuffer = await sharp(buffer)
    .png({ quality: 85, compressionLevel: 9 })
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .toBuffer();

  const path = `${artifactId}/images/final/${imageId}.png`;

  const { data, error } = await getSupabase().storage
    .from('artifacts')
    .upload(path, optimizedBuffer, {
      contentType: 'image/png',
      cacheControl: '31536000', // 1 year cache
      upsert: false, // Fail if file exists
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const url = getSupabase().storage.from('artifacts').getPublicUrl(path).data.publicUrl;

  return { url, path };
}

/**
 * Upload rejected image to debugging folder
 *
 * @param artifactId - Artifact UUID
 * @param imageId - Image UUID
 * @param buffer - Image buffer
 * @returns Public URL and storage path
 */
export async function uploadRejectedImage(
  artifactId: string,
  imageId: string,
  buffer: Buffer
): Promise<{ url: string; path: string }> {
  const path = `${artifactId}/images/rejected/${imageId}.png`;

  const { data, error } = await getSupabase().storage
    .from('artifacts')
    .upload(path, buffer, {
      contentType: 'image/png',
      cacheControl: '604800', // 7 days cache
      upsert: true, // Allow overwrite for debugging
    });

  if (error) {
    throw new Error(`Failed to upload rejected image: ${error.message}`);
  }

  const url = getSupabase().storage.from('artifacts').getPublicUrl(path).data.publicUrl;

  return { url, path };
}

/**
 * Delete all images in rejected folder (debugging cleanup)
 *
 * @param artifactId - Artifact UUID
 */
export async function deleteRejectedImages(artifactId: string): Promise<void> {
  const { data: files } = await getSupabase().storage
    .from('artifacts')
    .list(`${artifactId}/images/rejected/`);

  if (files?.length) {
    const paths = files.map(f => `${artifactId}/images/rejected/${f.name}`);
    await getSupabase().storage.from('artifacts').remove(paths);
  }
}

/**
 * Delete specific image from storage
 *
 * @param path - Full storage path
 */
export async function deleteImage(path: string): Promise<void> {
  const { error } = await getSupabase().storage
    .from('artifacts')
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Get public URL for an image
 *
 * @param path - Storage path
 * @returns Public CDN URL
 */
export function getPublicUrl(path: string): string {
  return getSupabase().storage.from('artifacts').getPublicUrl(path).data.publicUrl;
}

/**
 * Delete all images for an artifact (cleanup on artifact deletion)
 *
 * @param artifactId - Artifact UUID
 */
export async function deleteArtifactImages(artifactId: string): Promise<void> {
  // List all files in artifact folder
  const { data: files } = await getSupabase().storage
    .from('artifacts')
    .list(`${artifactId}/images/`);

  if (files?.length) {
    const paths = files.map(f => `${artifactId}/images/${f.name}`);
    await getSupabase().storage.from('artifacts').remove(paths);
  }
}

/**
 * Check if image exists in storage
 *
 * @param path - Storage path
 * @returns True if image exists
 */
export async function imageExists(path: string): Promise<boolean> {
  const { data, error } = await getSupabase().storage
    .from('artifacts')
    .list(path.split('/').slice(0, -1).join('/'));

  if (error) return false;

  const fileName = path.split('/').pop();
  return data?.some(f => f.name === fileName) || false;
}

/**
 * Get image file size in KB
 *
 * @param path - Storage path
 * @returns File size in KB
 */
export async function getImageSize(path: string): Promise<number> {
  const { data, error } = await getSupabase().storage
    .from('artifacts')
    .list(path.split('/').slice(0, -1).join('/'));

  if (error) return 0;

  const fileName = path.split('/').pop();
  const file = data?.find(f => f.name === fileName);

  return file?.metadata?.size ? Math.round(file.metadata.size / 1024) : 0;
}
