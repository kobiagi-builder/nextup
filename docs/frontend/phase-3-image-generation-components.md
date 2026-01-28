# Phase 3 Image Generation Frontend Components

**Version:** 1.0.0
**Last Updated:** 2026-01-28
**Status:** Complete

## Overview

Phase 3 introduces frontend components for image generation, approval, and regeneration. These components integrate with the backend image generation pipeline (DALL-E 3 / Gemini Imagen 4) to provide a seamless user experience for creating visual content.

**Key Features:**
- Image description approval workflow
- Final image generation with progress indicators
- Image regeneration with attempt limits (max 3)
- Auto-approval workflow (simplified MVP flow)

---

## Component Architecture

```
ArtifactEditor
├── ImageApprovalPanel (conditional: status = 'placeholder_review')
│   └── ImageNeed cards with approve/reject actions
├── ImageRegenerationModal (on user action)
│   └── Description editing and regeneration
└── useImageGeneration hook
    ├── useApproveImageDescriptions
    ├── useRejectImageDescriptions
    ├── useGenerateFinalImages
    └── useRegenerateImage
```

---

## Components

### ImageApprovalPanel

**Location:** `frontend/src/features/portfolio/components/artifact/ImageApprovalPanel.tsx`

**Purpose:** Displays image needs (text descriptions) for user approval before generating final images.

**Props:**
```typescript
interface ImageApprovalPanelProps {
  artifactId: string;
  imageNeeds: ImageNeed[];
  onApprove: (ids: string[]) => Promise<void>;
  onReject: (ids: string[]) => Promise<void>;
  onGenerateFinals: () => Promise<void>;
  isLoading?: boolean;
}
```

**Features:**
- Grid layout showing all image needs
- Individual approve/reject buttons per image
- "Approve All" bulk action
- "Generate Final Images" button (enabled when at least 1 approved)
- Visual status indicators (green ring = approved, red ring = rejected)
- Purpose and style badges per image

**Usage in ArtifactEditor:**
```tsx
{showImageApprovalPanel && visualsMetadata && (
  <ImageApprovalPanel
    artifactId={artifactId}
    imageNeeds={visualsMetadata.needs}
    onApprove={handleApproveImages}
    onReject={handleRejectImages}
    onGenerateFinals={handleGenerateFinals}
    isLoading={isImageOperationLoading}
  />
)}
```

**State Management:**
- Local state for optimistic updates (approvedIds, rejectedIds sets)
- Reverts on API error
- Processing state during generation

---

### ImageRegenerationModal

**Location:** `frontend/src/features/portfolio/components/artifact/ImageRegenerationModal.tsx`

**Purpose:** Allows users to regenerate a specific image with an updated description.

**Props:**
```typescript
interface ImageRegenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: FinalImage;
  imageNeed: ImageNeed;
  onRegenerate: (imageId: string, newDescription: string) => Promise<void>;
}
```

**Features:**
- Displays current image with resolution and file size
- Editable description textarea
- Attempts remaining counter (max 3 per image)
- Disabled state when attempts exhausted
- Loading state during regeneration
- Error display for failed regeneration

**Usage in ArtifactEditor:**
```tsx
{regeneratingImage && regeneratingImageNeed && (
  <ImageRegenerationModal
    isOpen={true}
    onClose={closeRegenerationModal}
    image={regeneratingImage}
    imageNeed={regeneratingImageNeed}
    onRegenerate={handleRegenerateImage}
  />
)}
```

**Attempt Limits:**
```typescript
const attemptsRemaining = 3 - (image.generation_attempts || 1);
const hasAttemptsRemaining = attemptsRemaining > 0;

// Disabled when no attempts remaining
disabled={!hasAttemptsRemaining || isRegenerating}
```

---

## Hooks

### useImageGeneration

**Location:** `frontend/src/features/portfolio/hooks/useImageGeneration.ts`

**Purpose:** Combined hook providing all image generation mutations.

**Returns:**
```typescript
interface UseImageGenerationReturn {
  approveDescriptions: (ids: string[]) => Promise<void>;
  rejectDescriptions: (ids: string[]) => Promise<void>;
  generateFinals: () => Promise<void>;
  regenerateImage: (params: { imageId: string; description: string }) => Promise<void>;
  isLoading: boolean;
}
```

**Usage:**
```typescript
const {
  approveDescriptions,
  rejectDescriptions,
  generateFinals,
  regenerateImage,
  isLoading,
} = useImageGeneration(artifactId);
```

**API Endpoints:**
- `POST /api/artifacts/:id/images/approve` - Approve/reject descriptions
- `POST /api/artifacts/:id/images/generate` - Generate final images
- `POST /api/artifacts/:id/images/:imageId/regenerate` - Regenerate specific image

**Cache Invalidation:**
All mutations invalidate `artifactKeys.detail(artifactId)` to refetch updated `visuals_metadata`.

---

### Individual Mutation Hooks

#### useApproveImageDescriptions
```typescript
export function useApproveImageDescriptions(artifactId: string) {
  return useMutation({
    mutationFn: async (imageIds: string[]) => {
      // POST /api/artifacts/:id/images/approve
      // Body: { approvedIds: imageIds, rejectedIds: [] }
    }
  });
}
```

#### useRejectImageDescriptions
```typescript
export function useRejectImageDescriptions(artifactId: string) {
  return useMutation({
    mutationFn: async (imageIds: string[]) => {
      // POST /api/artifacts/:id/images/approve
      // Body: { approvedIds: [], rejectedIds: imageIds }
    }
  });
}
```

#### useGenerateFinalImages
```typescript
export function useGenerateFinalImages(artifactId: string) {
  return useMutation({
    mutationFn: async () => {
      // POST /api/artifacts/:id/images/generate
    }
  });
}
```

#### useRegenerateImage
```typescript
export function useRegenerateImage(artifactId: string) {
  return useMutation({
    mutationFn: async ({ imageId, description }) => {
      // POST /api/artifacts/:id/images/:imageId/regenerate
      // Body: { description }
    }
  });
}
```

---

## Types

### ImageNeed
```typescript
interface ImageNeed {
  id: string;
  placement_after: string;
  description: string;
  purpose: 'hero' | 'illustration' | 'diagram' | 'photo' | 'screenshot' | 'chart';
  style: 'professional' | 'modern' | 'abstract' | 'realistic';
  approved: boolean;
}
```

### FinalImage
```typescript
interface FinalImage {
  id: string;
  image_need_id: string;
  url: string;
  storage_path: string;
  resolution: { width: number; height: number };
  file_size_kb: number;
  generated_at: string;
  generation_attempts: number;
}
```

### VisualsMetadata
```typescript
interface VisualsMetadata {
  phase: { phase: 'not_started' | 'identifying_needs' | 'generating_images' | 'complete' };
  needs: ImageNeed[];
  finals: FinalImage[];
  generation_stats: {
    total_needed: number;
    finals_generated: number;
    failures: number;
  };
}
```

---

## Integration with ArtifactEditor

### Phase 3 UI States

The ArtifactEditor component shows different UI based on artifact status and `visuals_metadata.phase`:

```typescript
// Image approval panel (currently disabled for auto-approval workflow)
const showImageApprovalPanel = false; // Auto-approval skips this step

// Complete banner (shows when status = 'ready' and phase = 'complete')
const showCompleteBanner = status === 'ready' && visualsMetadata?.phase?.phase === 'complete';

// Image generation progress (shows during creating_visuals status)
const isGeneratingImages = status === 'creating_visuals';
```

### Progress Indicators

```tsx
{isGeneratingImages && !showImageApprovalPanel && (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
        <div className="flex-1">
          <p className="font-medium">
            {visualsMetadata?.phase?.phase === 'identifying_needs' &&
              'Analyzing content for images...'}
            {visualsMetadata?.phase?.phase === 'generating_images' &&
              `Generating final images... ${completed}/${total}`}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

### Complete Banner

```tsx
{showCompleteBanner && (
  <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
    <PartyPopper className="h-4 w-4 text-green-600" />
    <AlertTitle>Content Creation Complete!</AlertTitle>
    <AlertDescription>
      Your artifact is ready for final review. You can still edit content and regenerate
      images if needed.
    </AlertDescription>
  </Alert>
)}
```

---

## Auto-Approval Workflow

Phase 3 MVP uses an auto-approval workflow that skips the manual placeholder review step:

1. Content is written (`status = 'writing'`)
2. Status changes to `creating_visuals`
3. Backend automatically:
   - Extracts `[IMAGE: ...]` placeholders
   - Auto-approves all image needs
   - Generates final images with DALL-E 3 / Gemini Imagen 4
   - Embeds images in content
   - Updates status to `ready`
4. Frontend shows progress during generation
5. Complete banner appears when done

**Rationale:** Eliminates user friction while maintaining option to regenerate specific images if needed.

---

## Error Handling

### Mutation Errors
```typescript
const handleApprove = async (id: string) => {
  try {
    await onApprove([id]);
  } catch (error) {
    // Revert optimistic update
    setApprovedIds(approvedIds);
    setRejectedIds(rejectedIds);
  }
};
```

### Regeneration Errors
```tsx
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

---

## Related Documentation

- [core-tools-reference.md](../ai-agents-and-prompts/core-tools-reference.md) - Backend tool specifications
- [pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md) - Complete pipeline with Phase 3
- [7-status-workflow-specification.md](../artifact-statuses/7-status-workflow-specification.md) - Status workflow including creating_visuals
- [content-agent-architecture.md](../Architecture/backend/content-agent-architecture.md) - Backend architecture

---

**Version History:**
- **1.0.0** (2026-01-28) - Initial Phase 3 frontend component documentation
