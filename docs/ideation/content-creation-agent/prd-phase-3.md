# PRD: Phase 3 - Graphics & Completion

**Phase**: 3 of 4
**Status**: Ready for Implementation
**Dependencies**: Phase 2 (content approved, skeleton structure available)
**Deliverables**: Image placeholder generation, final image generation, notification system

---

## Phase Overview

Phase 3 adds visual content to artifacts by identifying image needs, generating placeholder concepts for user approval, creating final images using Gemini Nano Banana, and notifying users when content is complete.

**Why Phase 3 Third**:
- Requires approved content to identify image context
- Validates placeholder-first workflow before final generation
- Completes the full content creation pipeline
- Enables user notification and review workflow

---

## User Stories

### Epic 1: Image Needs Identification

**US-3.1**: As a user with approved content, I want the AI to automatically identify where images are needed so I don't have to manually specify image placements.

**Acceptance Criteria**:
- ✅ Image identification starts after content approval
- ✅ Artifact status changes to `identifying_images` (new status)
- ✅ AI analyzes content structure and identifies logical image placements:
  - **Blog**: Hero image, 1 image per H2 section, optional conclusion image
  - **Social Post**: 1-2 primary images
  - **Showcase**: Hero image, problem illustration, solution diagram, results visualization
- ✅ Image suggestions include:
  - Placement location (after which heading/paragraph)
  - Suggested image description/concept
  - Image purpose (illustration, diagram, photo, screenshot)
- ✅ Image suggestions stored in artifact metadata (`image_needs` field)
- ✅ Minimum 1 image, maximum based on type (blog: 6, social: 2, showcase: 4)

---

### Epic 2: Placeholder Image Generation

**US-3.2**: As a user, I want to see placeholder images (concepts/wireframes) so I can approve image directions before final generation.

**Acceptance Criteria**:
- ✅ Placeholder generation starts after image needs identified
- ✅ Artifact status changes to `generating_placeholders` (new status)
- ✅ Placeholders generated using simple text-to-image (low quality, fast)
- ✅ Placeholders show:
  - Basic concept/composition
  - Wireframe or rough sketch style
  - Text overlay describing the concept
- ✅ Placeholders inserted into content at suggested locations
- ✅ Each placeholder wrapped in Markdown with:
  - `![Placeholder: {description}](placeholder-url)`
  - Comment: `<!-- IMAGE PLACEHOLDER: {id} | CONCEPT: {description} -->`
- ✅ Placeholders visible in editor with "Placeholder" badge overlay

**US-3.3**: As a user, I want to approve or reject each placeholder image so I control which images are generated at high quality.

**Acceptance Criteria**:
- ✅ After placeholder generation, artifact status changes to `placeholder_review` (new status)
- ✅ Editor shows placeholder approval UI for each image:
  - Thumbnail preview
  - Description
  - "Approve" and "Reject" buttons
  - "Edit Description" option (modify concept before final generation)
- ✅ User can approve/reject placeholders individually
- ✅ Approved placeholders marked for final generation
- ✅ Rejected placeholders removed from content
- ✅ "Approve All Placeholders" button for bulk approval
- ✅ "Generate Final Images" button enabled when at least 1 placeholder approved

---

### Epic 3: Final Image Generation

**US-3.4**: As a user, I want high-quality final images generated using Gemini Nano Banana so my content has professional visuals.

**Acceptance Criteria**:
- ✅ Final generation starts when user clicks "Generate Final Images"
- ✅ Artifact status changes to `generating_images` (new status)
- ✅ Only approved placeholders are generated (rejected ones skipped)
- ✅ Final images generated using Gemini Nano Banana:
  - Image style: Professional, clean, modern
  - Resolution: 1200x630 for blogs, 1080x1080 for social, variable for showcase
  - Format: PNG or JPEG
- ✅ Generation progress shown: "Generating image 2 of 5..."
- ✅ Generated images uploaded to Supabase storage
- ✅ Placeholder Markdown replaced with final image URLs:
  - `![{description}](https://supabase-storage-url/image.png)`
- ✅ Generation failures retry up to 2 times per image
- ✅ Failed images keep placeholder with error badge

**US-3.5**: As a user, I want to regenerate specific images if I'm not satisfied with the output.

**Acceptance Criteria**:
- ✅ After final generation, each image has "Regenerate" button
- ✅ Clicking regenerate button:
  - Shows modal to edit image description/prompt
  - Regenerates image using updated description
  - Replaces image in content
- ✅ Regeneration limit: 3 attempts per image
- ✅ Regeneration uses same Gemini Nano Banana model
- ✅ User can manually upload image to replace generated one

---

### Epic 4: Completion & Notification

**US-3.6**: As a user, I want to be notified when all images are generated so I know my content is ready for final review.

**Acceptance Criteria**:
- ✅ After final image generation completes, artifact status changes to `complete` (new status)
- ✅ Toast notification: "🎉 Content creation complete! Review your artifact and publish when ready."
- ✅ Email notification sent (optional, user preference)
- ✅ In-app notification badge on Portfolio page
- ✅ Notification includes link to artifact editor
- ✅ Editor shows "Content Complete" banner at top

**US-3.7**: As a user, I want to review the complete artifact (text + images) before publishing so I can ensure quality.

**Acceptance Criteria**:
- ✅ Editor shows final review mode:
  - All content sections visible
  - All images embedded
  - Read-only preview toggle
  - "Publish" button enabled (if artifact is ready for publishing)
- ✅ User can still edit content/images after completion
- ✅ Editing after completion does not change status back
- ✅ "Mark as Ready" button changes status to `ready` (publishable)

---

## Functional Requirements

### FR-1: Image Needs Identification

**Requirement**: AI must intelligently identify where images should be placed based on content structure.

**Implementation**:
1. Backend tool: `identifyImageNeeds`
   - Input: Artifact content (Markdown), artifact type
   - Output: Array of image needs with placement and description
   - Model: Claude (better for structural analysis)

2. Claude prompt structure:
   ```
   You are analyzing content to identify where images would enhance the message.

   Artifact type: [blog/social_post/showcase]
   Content:
   [Artifact content in Markdown]

   Identify logical image placements:
   - Hero image (always)
   - Section illustrations (1 per major section for blogs/showcases)
   - Supporting visuals (diagrams, charts, screenshots)

   For each image, specify:
   1. Placement: After which heading or paragraph (use line numbers)
   2. Description: What should the image show?
   3. Purpose: illustration, diagram, photo, screenshot, chart
   4. Style: professional, modern, abstract, realistic

   Type-specific rules:
   - Blog: Hero + 1 per H2 section (max 6 images)
   - Social Post: 1-2 primary images only
   - Showcase: Hero + problem illustration + solution + results (max 4)

   Return JSON array of image needs.
   ```

3. Image needs schema:
   ```typescript
   interface ImageNeed {
     id: string // unique ID
     placement_after: string // heading text or line number
     description: string // what to show
     purpose: 'illustration' | 'diagram' | 'photo' | 'screenshot' | 'chart'
     style: 'professional' | 'modern' | 'abstract' | 'realistic'
   }
   ```

### FR-2: Gemini Nano Banana Integration

**Requirement**: Configure and use Gemini Nano Banana for image generation from scratch.

**Implementation Steps**:
1. **API Setup**:
   - Obtain Gemini Nano Banana API access (Google AI)
   - Configure authentication credentials in backend `.env`
   - Set up rate limiting and quota management

2. **Backend Tool**: `generateImageWithNanoBanana`
   - Input: Image description, style, resolution
   - Output: Image URL (Supabase storage)
   - Model: Gemini Nano Banana

3. **Generation Parameters**:
   ```typescript
   interface ImageGenerationParams {
     prompt: string // image description
     negative_prompt?: string // what to avoid
     style: 'professional' | 'modern' | 'abstract' | 'realistic'
     resolution: { width: number, height: number }
     quality: 'standard' | 'hd'
   }
   ```

4. **Prompt Enhancement**:
   - Enhance user description with style modifiers
   - Add artifact context (e.g., "for a blog post about AI agents")
   - Specify format requirements (clean, no text overlays, modern aesthetic)

5. **Storage Workflow**:
   - Generate image with Gemini Nano Banana
   - Upload to Supabase storage: `artifacts/{artifact_id}/images/{image_id}.png`
   - Generate public URL
   - Update artifact content with image URL

### FR-3: Placeholder Generation Strategy

**Requirement**: Generate quick, low-quality placeholders for user approval before final generation.

**Implementation**:
1. **Placeholder Tool**: Use simple text-to-image service (DALL-E mini, Replicate, or similar)
   - Fast generation (< 5 seconds per image)
   - Low cost (or free)
   - Sketch/wireframe style

2. **Placeholder Prompt**:
   ```
   Simple sketch wireframe showing: {description}
   Style: black and white line drawing, minimal detail, concept illustration
   No text, no colors, just basic shapes and composition
   ```

3. **Placeholder Storage**:
   - Temporary storage (not in Supabase, use in-memory or temp S3 bucket)
   - Placeholder URLs expire after 24 hours
   - Placeholders deleted after final generation

### FR-4: Artifact Status Transitions

**New Statuses**:
- `identifying_images` - Analyzing content for image needs
- `generating_placeholders` - Creating placeholder images
- `placeholder_review` - User reviewing placeholders
- `generating_images` - Creating final images with Gemini Nano Banana
- `complete` - All content and images ready

**Status Flow**:
```
content_approved → [Auto-trigger] → identifying_images
identifying_images → [Analysis complete] → generating_placeholders
generating_placeholders → [Placeholders ready] → placeholder_review
placeholder_review → [User clicks "Generate Final Images"] → generating_images
generating_images → [All images complete] → complete
complete → [User reviews] → ready (publishable)
```

---

## Non-Functional Requirements

### NFR-1: Performance

- Image needs identification completes in < 15 seconds
- Placeholder generation: < 30 seconds for all placeholders
- Final image generation: < 20 seconds per image
- Total Phase 3 completion: < 3 minutes for typical blog (5 images)

### NFR-2: Image Quality

- Final images: Minimum 1200x630 resolution
- File size: < 500KB per image (optimize for web)
- Format: PNG for graphics/diagrams, JPEG for photos/illustrations
- All images include alt text (from description)

### NFR-3: Cost Optimization

- Use free/cheap placeholder service (not Gemini Nano Banana)
- Only generate final images for approved placeholders
- Cache image generation results (avoid regenerating identical prompts)
- Implement daily generation limits per user (max 20 images/day)

### NFR-4: Storage

- Supabase storage bucket: `artifacts`
- Folder structure: `artifacts/{artifact_id}/images/{image_id}.{ext}`
- Public URLs with CDN caching
- Automatic cleanup of orphaned images (monthly job)

---

## Dependencies

### Backend Dependencies
- **New AI Tool**: `identifyImageNeeds` (Claude)
- **New AI Tool**: `generatePlaceholderImage` (DALL-E mini or similar)
- **New AI Tool**: `generateImageWithNanoBanana` (Gemini Nano Banana)
- **API Integration**: Gemini Nano Banana API (requires configuration from scratch)
- **Storage**: Supabase storage bucket configuration
- **Database Migration**: Add new artifact statuses

### Frontend Dependencies
- **New Component**: `PlaceholderApprovalUI` (approve/reject placeholders)
- **New Component**: `ImageRegenerationModal` (edit description and regenerate)
- **Modified Component**: `ArtifactEditor` (show image generation progress, placeholder badges)
- **New Hook**: `useImageGeneration` (trigger and track image generation)
- **Modified Types**: Add new statuses, image needs schema

### External Dependencies
- **Gemini Nano Banana API**: Google AI access (requires setup from scratch)
- **Placeholder Service**: DALL-E mini, Replicate, or similar free service
- **Supabase Storage**: Public bucket with CDN

---

## Acceptance Criteria (Phase 3 Complete)

Phase 3 is complete when:

- ✅ Image needs identified from approved content
- ✅ Placeholder images generated and shown to user
- ✅ User can approve/reject placeholders individually
- ✅ Final images generated using Gemini Nano Banana
- ✅ Images uploaded to Supabase storage
- ✅ Images embedded in artifact content (Markdown)
- ✅ User notified when content is complete
- ✅ User can regenerate specific images
- ✅ All artifact types (blog, social_post, showcase) supported
- ✅ All database migrations applied successfully

---

## Out of Scope (Phase 3)

- ❌ Custom image styles (future enhancement)
- ❌ Image editing tools (crop, resize, filters)
- ❌ Stock photo integration
- ❌ Custom tone examples (Phase 4)
- ❌ Publishing automation

---

## Testing Requirements

### Unit Tests
- Image needs identification logic
- Placeholder generation parameters
- Image storage and URL generation
- Status transition validation

### Integration Tests
- End-to-end: Content approval → Image needs → Placeholders → Final images → Complete
- Gemini Nano Banana API error handling
- Placeholder approval workflow
- Image regeneration workflow

### E2E Tests (Playwright)
- User approves content
- Placeholders appear in editor
- User approves placeholders
- Final images replace placeholders
- User regenerates specific image
- Completion notification shown

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini Nano Banana unavailable/unconfigured | High | Fallback to DALL-E or Stable Diffusion, manual image upload option |
| Image generation too slow (>30s per image) | Medium | Parallel generation where possible, progress indicators, queue system |
| Generated images low quality | Medium | Prompt engineering iteration, user regeneration option, manual upload fallback |
| Image needs identification misses context | Low | User can manually add image placeholders, edit descriptions before generation |

---

## Success Metrics

- **Image Generation Success Rate**: > 90% of images generate successfully
- **Placeholder Approval Rate**: > 70% of placeholders approved without changes
- **Time to Completion**: < 5 minutes from content approval to complete status
- **Image Quality Rating**: > 4/5 user rating on generated images
- **Regeneration Rate**: < 20% of images require regeneration

---

## Next Phase Preview

**Phase 4: Tone Enhancement** (Future)
- Analyze user-provided writing examples to learn custom tone
- Build default tone example library
- Enable tone customization beyond predefined options
- Machine learning model to match user's unique voice

Phase 3 completes the MVP content creation pipeline. Phase 4 enhances tone matching with custom examples and learning.
