# NextUp

An AI-native operating system for advisors, consultants, and fractional service providers. Built with React frontend and Node.js backend, using Supabase for database and auth.

## Tech Stack

### Frontend

| Category       | Technology           | Version         |
| -------------- | -------------------- | --------------- |
| Framework      | React                | 19.2.0          |
| Language       | TypeScript           | 5.9.3           |
| Build Tool     | Vite                 | 7.2.4           |
| Styling        | Tailwind CSS         | 3.4.19          |
| UI Components  | shadcn/ui (Radix)    | -               |
| Icons          | Lucide React         | 0.562.0         |
| State (Client) | Zustand              | 5.0.10          |
| State (Server) | TanStack React Query | 5.90.19         |
| Forms          | React Hook Form      | 7.71.1          |
| Validation     | Zod                  | 4.3.5           |
| Routing        | React Router         | 7.12.0          |
| Testing        | Vitest + Playwright  | 4.0.17 / 1.57.0 |

### Backend

| Category   | Technology            | Version       |
| ---------- | --------------------- | ------------- |
| Runtime    | Node.js               | -             |
| Framework  | Express               | 4.21.0        |
| Language   | TypeScript            | 5.6.0         |
| Database   | Supabase (PostgreSQL) | 2.91.0        |
| Validation | Zod                   | 3.23.0        |
| Security   | Helmet + CORS         | 8.0.0 / 2.8.5 |
| Dev Runner | tsx                   | 4.19.0        |

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

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `npm run dev`          | Start both frontend and backend |
| `npm run dev:frontend` | Start frontend only (port 5173) |
| `npm run dev:backend`  | Start backend only (port 3001)  |
| `npm run build`        | Build both frontend and backend |
| `npm run test`         | Run frontend tests              |

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
import { api } from "@/lib/api";

// Without auth
const health = await api.get("/api/health");

// With auth token
const data = await api.get("/api/users", { token: accessToken });
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

- **Project:** `ohwubfmipnpguunryopl` (nextup)

### Example Usage

```typescript
// Query data
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT * FROM users WHERE id = $1",
});

// Apply migration
mcp__supabase__apply_migration({
  project_id: "ohwubfmipnpguunryopl",
  name: "add_user_preferences",
  query: "CREATE TABLE user_preferences (...)",
});
```

**NEVER** ask the user to manually run SQL in Supabase SQL Editor - always use MCP tools.

## Git Workflow

### Repository

- **GitHub:** https://github.com/kobiagi-builder/consultant-helper
- **Remote:** `git@github.com:kobiagi-builder/consultant-helper.git`
- **Main Branch:** `main`

### Pre-Push Hook

A pre-push hook is configured to enforce quality standards before pushing to remote. The hook automatically runs:

1. **Sensitive File Check** - Blocks push if `.env` files are staged
2. **TODO/FIXME Check** - Warns about BLOCKING comments
3. **TypeScript Compilation** - Blocks push if frontend build fails
4. **Test Execution** - Warns if tests fail

**Location:** `.git/hooks/pre-push`

**To bypass hook (not recommended):**

```bash
git push --no-verify
```

### Commit Conventions

Follow conventional commit format:

```
<type>(<scope>): <description>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Example:**

```bash
git commit -m "$(cat <<'EOF'
feat(portfolio): add artifact creation workflow

- Implement multi-step artifact form
- Add AI chat integration for artifact refinement
- Include research area selector

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### Protected Files

These files must NEVER be committed:

- `.env` (root environment)
- `.env.local` (frontend environment)
- `backend/.env` (backend environment)
- `frontend/.env.local` (frontend local environment)
- Any file containing API keys, secrets, or credentials

All sensitive files are listed in [.gitignore](.gitignore).

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
import { logger } from "@/lib/logger";

logger.debug("Debug message", { context: "value" });
logger.info("Info message");
logger.error("Error message", { error });
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

**Evidence Gathering Approach:**

For application-level debugging, use **file-based logs** + **Supabase data queries**:

```typescript
// 1. Read application logs from file system
Read('backend/logs/debug.log')
Read('backend/logs/console-output.log')

// Or search for specific patterns
Grep({ pattern: "artifact.*<id>", path: "backend/logs" })
Grep({ pattern: "ContentAgent.*execute", path: "backend/logs" })

// 2. Query database for relevant data
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT * FROM artifacts WHERE id = $1"
})
```

**CRITICAL**: Do NOT use `mcp__supabase__get_logs()` for application debugging:
- Supabase API logs only show HTTP requests (gateway level)
- They do NOT contain application logic, tool executions, or business decisions
- File-based logs contain the actual LoggerService output with full context

**When to use Supabase logs** (rare cases only):
- Database-level errors (`service: "postgres"`)
- Auth service errors (`service: "auth"`)
- Infrastructure issues (`service: "edge-functions"`)

**Related Documentation:**

- Complete skill guide: `.claude/skills/debugging/SKILL.md`
- Debugging rules: `.claude/rules/debugging/use-debugging-skill.md`

## Product Documentation

**MANDATORY:** After completing ANY feature implementation, feature update, bug fix that changes behavior, or refactoring that alters architecture, invoke the `product-documentation` skill to update `docs/`.

The documentation covers 12 layers:

| Layer | Location | What |
|-------|----------|------|
| Product Overview | `docs/PRODUCT_OVERVIEW.md` | Value proposition, feature list, current state |
| User Flows | `docs/flows/` | Step-by-step user journeys with diagrams |
| Screens | `docs/screens/` | Component hierarchy, interactions, responsive behavior |
| State Machines | `docs/artifact-statuses/` | Transitions, guards, UI behavior per state |
| Features | `docs/features/` | Deep feature docs (user + technical perspective) |
| Architecture | `docs/Architecture/` | System, backend, frontend, database, AI, security |
| API Reference | `docs/api/` | Endpoints, schemas, auth, rate limits, examples |
| AI Agents & Tools | `docs/ai-agents-and-prompts/` | Agents, tools, prompts, pipeline, intent detection |
| Database Schema | `docs/Architecture/database/` | Tables, relationships, indexes, RLS, JSONB structures |
| Auth & Security | `docs/api/` + `docs/Architecture/backend/` | Auth flow, middleware, validation, rate limiting |
| Testing | `docs/testing/` | Strategy, infrastructure, coverage |
| Index | `docs/DOCUMENTATION_INDEX.md` | Master index of all documentation |

**Workflow integration:**
- The `product-documentation` skill runs automatically at the end of every development cycle
- It is part of the mandatory post-implementation sequence: **Code Review → Documentation Update**
- The skill reads the git diff and conversation context to determine what changed and which layers need updating

## Adding shadcn Components

```bash
cd frontend && npx shadcn@latest add [component-name]
```

## File Naming

- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Routes/Controllers: `kebab-case.ts`
- Types: `kebab-case.ts`
