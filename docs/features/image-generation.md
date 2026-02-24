# Image Generation

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

Image Generation creates visual content for artifacts during the pipeline (`creating_visuals` status) and supports user-triggered regeneration. Images are generated from `[IMAGE: description]` placeholders using DALL-E 3 or Gemini Imagen 4, uploaded to Supabase Storage, and embedded in content.

---

## How It Works (Technical)

### Pipeline Tools

| Tool | Purpose | Status Transition |
|------|---------|-------------------|
| `identifyImageNeeds` | Scan content for `[IMAGE:]` placeholders, generate images | → `creating_visuals` |
| `generateFinalImages` | Generate high-quality images for approved needs | `creating_visuals` → `ready` |
| `updateImageApproval` | Approve/reject image descriptions before generation | None |
| `regenerateImage` | Regenerate specific image (max 3 attempts) | None |

### Image Need Structure

```typescript
interface ImageNeed {
  id: string                    // UUID
  placement_after: string       // Position hint ('title', 'first section', etc.)
  description: string           // Image generation prompt
  purpose: 'hero' | 'illustration' | 'photo'
  style: 'professional' | 'modern' | 'abstract' | 'realistic' | 'editorial' | 'cinematic'
  approved: boolean
}
```

### Generation Flow

1. Extract title and content themes (headings, bold text)
2. Analyze mood from tone and content
3. Generate visual identity for cross-image consistency
4. For each image need:
   - Determine resolution based on type/purpose
   - Generate with retry (2 attempts)
   - Upload to Supabase Storage
   - Insert `<img>` tag at correct position in content
5. Update artifact: content with images, status → `ready`

### Providers

| Provider | Model | Use Case |
|----------|-------|----------|
| OpenAI | DALL-E 3 | Text-to-image generation |
| Google | Gemini Imagen 4 | Alternative generation |
| OpenAI | Image editing API | Image-to-image (for improvements) |

### Storage

- **Bucket:** `artifact-images`
- **Path:** `{user_id}/{artifact_id}/{image_name}.png`
- **Access:** Public URLs via Supabase CDN

---

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `ImageApprovalPanel` | Review, approve/reject image descriptions |
| `ImageBubbleMenu` | Click image → crop, regenerate, delete |
| `ImageCropModal` | Crop images in editor |

### ImageApprovalPanel States

| State | Visual |
|-------|--------|
| Approved | Green ring, checkmark |
| Rejected | Red ring, 50% opacity |
| Pending | Default card |

---

## Known Limitations

- Max 3 regeneration attempts per image
- Generation may fail; content is usable without images
- Image descriptions are AI-estimated (may not match user intent perfectly)
- No batch regeneration — one image at a time

---

## Related Documentation

- [image-generation-flow.md](../flows/image-generation-flow.md) - User flow
- [artifact-page.md](../screens/artifact-page.md) - UI components
- [content-creation-agent.md](./content-creation-agent.md) - Pipeline overview
