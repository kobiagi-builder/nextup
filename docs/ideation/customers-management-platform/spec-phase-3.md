# Implementation Spec: Customers Management Platform - Phase 3

**PRD**: ./prd-phase-3.md
**UX/UI**: ./ux-ui-spec.md (Section 6)
**Estimated Effort**: L

## Technical Approach

Phase 3 activates the Projects tab with full project and artifact CRUD. Projects represent product management workflow engagements, and artifacts are the deliverables within those projects (strategies, research docs, roadmaps, etc.).

The database tables already exist from Phase 1. This phase adds backend API endpoints, frontend components for the Projects tab (project list, project detail view with artifact list), and an artifact editor that reuses the TipTap rich text editor pattern from the Portfolio module.

The artifact editor should reuse the underlying `RichTextEditor` component (the TipTap wrapper), NOT the `ArtifactEditor` from the Portfolio module which is deeply coupled to portfolio-specific logic (Content Agent selection, ImageBubbleMenu, editorSelectionStore). If `RichTextEditor` hasn't been extracted to a shared location, extract it to `frontend/src/components/shared/RichTextEditor.tsx` as part of this phase.

**Content format**: Customer artifacts store content as Markdown. The TipTap editor converts Markdown to HTML on load and HTML back to Markdown on save using a markdown-to-html utility.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| **Backend** | |
| `backend/src/services/ProjectService.ts` | Project CRUD business logic |
| `backend/src/controllers/project.controller.ts` | Project request handlers |
| `backend/src/routes/projects.ts` | Project API routes |
| `backend/src/services/CustomerArtifactService.ts` | Customer artifact CRUD |
| `backend/src/controllers/customer-artifact.controller.ts` | Artifact request handlers |
| `backend/src/routes/customer-artifacts.ts` | Artifact API routes |
| **Frontend** | |
| `frontend/src/features/customers/hooks/useProjects.ts` | TanStack Query hooks for projects |
| `frontend/src/features/customers/hooks/useCustomerArtifacts.ts` | TanStack Query hooks for artifacts |
| `frontend/src/features/customers/components/projects/ProjectsTab.tsx` | Projects tab content (list view) |
| `frontend/src/features/customers/components/projects/ProjectCard.tsx` | Single project card |
| `frontend/src/features/customers/components/projects/ProjectDetail.tsx` | Expanded project detail view |
| `frontend/src/features/customers/components/projects/ProjectForm.tsx` | Create/edit project dialog |
| `frontend/src/features/customers/components/projects/ArtifactRow.tsx` | Artifact list item |
| `frontend/src/features/customers/components/projects/ArtifactEditor.tsx` | Artifact content editor (TipTap) |
| `frontend/src/features/customers/components/projects/ArtifactForm.tsx` | Create artifact dialog |
| `frontend/src/features/customers/components/projects/index.ts` | Barrel export |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/customers/pages/CustomerDetailPage.tsx` | Replace Projects tab placeholder with ProjectsTab component |
| `frontend/src/features/customers/hooks/index.ts` | Export new hooks |
| `frontend/src/features/customers/components/index.ts` | Export new components |
| `frontend/src/features/customers/types/customer.ts` | Add Project, CustomerArtifact, ArtifactType types |
| `frontend/src/features/customers/components/shared/CustomerCard.tsx` | Add project count to card metrics |
| `frontend/src/features/customers/components/overview/QuickStats.tsx` | Add project count stat |

## Implementation Details

### Project & Artifact Types

```typescript
export interface Project {
  id: string;
  customer_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  agreement_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';

export interface CustomerArtifact {
  id: string;
  project_id: string;
  customer_id: string;
  type: ArtifactType;
  title: string;
  content: string;
  status: ArtifactStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ArtifactType =
  | 'strategy'
  | 'research'
  | 'roadmap'
  | 'competitive_analysis'
  | 'user_research'
  | 'product_spec'
  | 'meeting_notes'
  | 'presentation'
  | 'ideation'
  | 'custom';

export type ArtifactStatus = 'draft' | 'in_progress' | 'review' | 'final' | 'archived';
```

### Backend API Endpoints

**Projects** (mounted at `/api/customers/:customerId/projects`):

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/` | List projects for customer |
| `GET` | `/:id` | Get project with artifact list |
| `POST` | `/` | Create project |
| `PUT` | `/:id` | Update project |
| `DELETE` | `/:id` | Delete project (cascades to artifacts) |

**Artifacts** (mounted at `/api/customers/:customerId/projects/:projectId/artifacts`):

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/` | List artifacts in project |
| `POST` | `/` | Create artifact |
| `PUT` | `/:id` | Update artifact (title, content, status, type) |
| `DELETE` | `/:id` | Delete artifact |

**Cross-project artifacts** (mounted at `/api/customers/:customerId/artifacts`):

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/` | List ALL artifacts across all projects for a customer |

### Projects Tab - UI Flow

The Projects tab has two views:

1. **List view** (default): Shows project cards with name, status, artifact count, linked agreement
2. **Detail view** (after clicking a project): Shows project header + artifact list

Navigation between views uses Zustand store state (not local state) to survive tab switches:

```typescript
// ProjectsTab.tsx
const { selectedProjectIds, setSelectedProjectId } = useCustomerStore();
const selectedProjectId = selectedProjectIds[customerId] || null;

if (selectedProjectId) {
  return <ProjectDetail
    projectId={selectedProjectId}
    onBack={() => setSelectedProjectId(customerId, null)}
  />;
}

return <ProjectList onSelect={(id) => setSelectedProjectId(customerId, id)} />;
```

**Why Zustand, not local state**: Local `useState` resets when the user switches tabs (shadcn Tabs unmounts TabsContent by default). Zustand preserves the selected project across tab switches.

### Artifact Editor

**Pattern to follow**: `frontend/src/features/portfolio/components/editor/ArtifactEditor.tsx`

The customer artifact editor reuses the same TipTap editor configuration. Key differences:
- No Content Agent integration (that comes in Phase 4)
- Simpler toolbar (no AI-specific tools)
- Auto-save on content changes (debounced 1.5s)

```typescript
// ArtifactEditor.tsx
// Opens as a Sheet (side panel from right, max-w-3xl) — NOT a Dialog
// Sheet avoids TipTap-in-Dialog focus/scroll conflicts
// Header: type badge + title (editable) + status dropdown + auto-save indicator
// Body: RichTextEditor (shared TipTap wrapper) with standard toolbar
// Footer: close button

const debouncedSave = useDebouncedCallback(
  async (content: string) => {
    await updateArtifact.mutateAsync({ id: artifact.id, content });
  },
  1500
);
```

### Artifact Type Colors & Icons

```typescript
const ARTIFACT_TYPE_CONFIG: Record<ArtifactType, { label: string; color: string; icon: LucideIcon }> = {
  strategy: { label: 'Strategy', color: 'purple', icon: Target },
  research: { label: 'Research', color: 'blue', icon: Search },
  roadmap: { label: 'Roadmap', color: 'cyan', icon: Map },
  competitive_analysis: { label: 'Competitive', color: 'red', icon: Target },
  user_research: { label: 'User Research', color: 'indigo', icon: Users },
  product_spec: { label: 'Product Spec', color: 'green', icon: FileCode },
  meeting_notes: { label: 'Notes', color: 'gray', icon: NotebookPen },
  presentation: { label: 'Presentation', color: 'amber', icon: Presentation },
  ideation: { label: 'Ideation', color: 'pink', icon: Lightbulb },
  custom: { label: 'Custom', color: 'slate', icon: File },
};
```

**Implementation steps**:
1. Add Project and CustomerArtifact types
2. Extract `RichTextEditor` to `frontend/src/components/shared/RichTextEditor.tsx` if not already shared
3. Create ProjectService and CustomerArtifactService
4. Create controllers with Zod validation
5. Create routes and mount in main router (use `mergeParams: true` for nested routes)
6. Create TanStack Query hooks (useProjects, useCustomerArtifacts)
7. Build ProjectCard component
8. Build ProjectDetail view with artifact list (detail view within tab, not sub-route)
9. Build ArtifactRow component
10. Build ArtifactEditor as Sheet (max-w-3xl) using shared RichTextEditor with markdown-to-html conversion
11. Build ProjectForm and ArtifactForm dialogs
12. Build ProjectsTab with list/detail view switching via Zustand store (not local state)
13. Replace Projects tab placeholder in CustomerDetailPage
14. Add project count to CustomerCard and QuickStats

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/services/__tests__/ProjectService.test.ts` | Project CRUD |
| `backend/src/services/__tests__/CustomerArtifactService.test.ts` | Artifact CRUD |

**Key test cases**:
- Create project with minimal fields
- Create project linked to agreement
- Delete project cascades to artifacts
- Create artifact with content
- Update artifact content (auto-save simulation)
- List all artifacts across projects for a customer
- Artifact type validation

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/routes/__tests__/projects.integration.test.ts` | Projects API |
| `backend/src/routes/__tests__/customer-artifacts.integration.test.ts` | Artifacts API |

### Manual Testing

- [ ] Projects tab shows project cards
- [ ] Create new project with all fields
- [ ] Click project card shows detail view with artifacts
- [ ] Back button returns to project list
- [ ] Create artifact in project
- [ ] Artifact editor opens with TipTap toolbar
- [ ] Type rich text content (headings, lists, bold, links)
- [ ] Auto-save triggers after typing pause
- [ ] Artifact type badges show correct colors
- [ ] Delete project removes it and all artifacts
- [ ] Customer card shows project count

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Project not found | Return 404, show error state |
| Artifact save failure (auto-save) | Show "Save failed" indicator, retry on next edit |
| Delete project with artifacts | Cascade delete (confirmed by dialog) |
| Large artifact content | No size limit; TipTap handles performance |

## Validation Commands

```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
cd backend && npm run test
cd frontend && npm run test
npm run build
```

## Feature Flag System

### Requirement

The entire Customers Management feature (all phases) must be gated behind a feature flag. The flag system is generic and reusable for future features.

### Database Tables

**Table 1: `feature_flag_configuration`** -- Defines available feature flags with defaults.

```sql
CREATE TABLE feature_flag_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_state BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Table 2: `account_feature_flag`** -- Per-account overrides.

```sql
CREATE TABLE account_feature_flag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id),
  feature_id UUID NOT NULL REFERENCES feature_flag_configuration(id),
  state BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, feature_id)
);
```

### Initial Data

```sql
-- Feature flag definition
INSERT INTO feature_flag_configuration (feature_name, description, default_state)
VALUES ('customers_management', 'Customers Management Platform (CRM-lite)', false);

-- Enable for specific accounts
INSERT INTO account_feature_flag (account_id, feature_id, state)
SELECT account_id, ff.id, true
FROM (VALUES
  ('f62e4f84-b493-4a66-b6cd-0c2484118120'::uuid),
  ('c6fd701d-99d7-4cd3-b1a3-a15e2f12084b'::uuid),
  ('b711c6e7-1839-4b01-8e86-b1aceda54d7a'::uuid)
) AS accounts(account_id)
CROSS JOIN feature_flag_configuration ff
WHERE ff.feature_name = 'customers_management';
```

### Coverage

The feature flag must gate:
- **Frontend**: Sidebar nav item, mobile nav item, route rendering (`/customers`, `/customers/:id`)
- **Backend**: All `/api/customers/*` routes (return 403 if flag disabled)

### Resolution Logic

```
IF account_feature_flag exists for (account_id, feature_id):
  USE account_feature_flag.state
ELSE:
  USE feature_flag_configuration.default_state
```

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
