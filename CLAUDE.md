# Product Consultant Helper

A SaaS application with React frontend and Node.js backend, using Supabase for database and auth.

## Tech Stack

### Frontend
| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 19.2.0 |
| Language | TypeScript | 5.9.3 |
| Build Tool | Vite | 7.2.4 |
| Styling | Tailwind CSS | 3.4.19 |
| UI Components | shadcn/ui (Radix) | - |
| Icons | Lucide React | 0.562.0 |
| State (Client) | Zustand | 5.0.10 |
| State (Server) | TanStack React Query | 5.90.19 |
| Forms | React Hook Form | 7.71.1 |
| Validation | Zod | 4.3.5 |
| Routing | React Router | 7.12.0 |
| Testing | Vitest + Playwright | 4.0.17 / 1.57.0 |

### Backend
| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Node.js | - |
| Framework | Express | 4.21.0 |
| Language | TypeScript | 5.6.0 |
| Database | Supabase (PostgreSQL) | 2.91.0 |
| Validation | Zod | 3.23.0 |
| Security | Helmet + CORS | 8.0.0 / 2.8.5 |
| Dev Runner | tsx | 4.19.0 |

## Project Structure

```
Product_Consultant_Helper/
├── frontend/                # React application
│   ├── src/
│   │   ├── components/ui/   # shadcn/ui components
│   │   ├── features/        # Feature modules
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities (api, supabase, logger)
│   │   ├── stores/          # Zustand stores
│   │   └── types/           # TypeScript types
│   └── package.json
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, error handling
│   │   ├── lib/             # Supabase client, logger
│   │   └── types/           # TypeScript types
│   └── package.json
├── package.json             # Root workspace config
└── .env.example             # Environment template
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run dev:frontend` | Start frontend only (port 5173) |
| `npm run dev:backend` | Start backend only (port 3001) |
| `npm run build` | Build both frontend and backend |
| `npm run test` | Run frontend tests |

## Environment Variables

### Backend (`backend/.env`)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Required for backend
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env.local`)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_API_URL=http://localhost:3001
```

## API Patterns

### Backend Routes
All API routes are prefixed with `/api/`:
- `GET /api/health` - Health check

### Frontend API Client
```typescript
import { api } from '@/lib/api'

// Without auth
const health = await api.get('/api/health')

// With auth token
const data = await api.get('/api/users', { token: accessToken })
```

## Database Operations

**IMPORTANT:** All database operations MUST be executed using the Supabase MCP tools.

### Required Tools
- Use `mcp__supabase__execute_sql` for data queries (SELECT, INSERT, UPDATE, DELETE)
- Use `mcp__supabase__apply_migration` for DDL operations (CREATE, ALTER, DROP)
- Use `mcp__supabase__list_tables` for schema inspection
- Use `mcp__supabase__get_advisors` for security/performance checks after DDL changes

### Best Practices
Follow the guidelines in `.claude/skills/supabase-postgres-best-practices/SKILL.md` for:
- Query optimization and indexing strategies
- Row Level Security (RLS) policies
- Schema design patterns
- Performance tuning

### Project ID
- **Project:** `ohwubfmipnpguunryopl` (product-consultant-helper)

### Example Usage
```typescript
// Query data
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT * FROM users WHERE id = $1"
})

// Apply migration
mcp__supabase__apply_migration({
  project_id: "ohwubfmipnpguunryopl",
  name: "add_user_preferences",
  query: "CREATE TABLE user_preferences (...)"
})
```

**NEVER** ask the user to manually run SQL in Supabase SQL Editor - always use MCP tools.

## Conventions

### Components (Frontend)
- Use named exports: `export function MyComponent()`
- Define props interface: `interface MyComponentProps {}`
- Use `cn()` for className merging
- Import shadcn from `@/components/ui/`

### API Routes (Backend)
- Use Express Router for route grouping
- Apply `requireAuth` middleware for protected routes
- Use `ApiError` for consistent error responses

### Logging
Both frontend and backend have structured loggers:
```typescript
import { logger } from '@/lib/logger'

logger.debug('Debug message', { context: 'value' })
logger.info('Info message')
logger.error('Error message', { error })
```

### Debugging
When debugging issues, errors, or unexpected behavior, **ALWAYS use the `debugging` skill** for systematic evidence-based debugging:

```bash
# User reports an issue
User: "Feature X isn't working"

# Invoke the debugging skill
Assistant: "I'll use the debugging skill to investigate this systematically"
```

**Core Principles:**
- **NO SPECULATION**: Form conclusions only after gathering evidence
- **EXISTING LOGS FIRST**: Check existing logs before adding new ones
- **ROOT CAUSE ANALYSIS**: Fix underlying issues, not symptoms

**Evidence Gathering Tools:**
```typescript
// Fetch application logs
mcp__supabase__get_logs({
  project_id: "ohwubfmipnpguunryopl",
  service: "api"
});

// Query database for evidence
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT * FROM table WHERE condition"
});
```

**Related Documentation:**
- Complete skill guide: `.claude/skills/debugging/SKILL.md`
- Debugging rules: `.claude/rules/debugging/use-debugging-skill.md`

## Adding shadcn Components

```bash
cd frontend && npx shadcn@latest add [component-name]
```

## File Naming

- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Routes/Controllers: `kebab-case.ts`
- Types: `kebab-case.ts`
