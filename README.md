# NextUp

An AI-native operating system for advisors, consultants, and fractional service providers.

## Tech Stack

**Frontend:**
- React 19.2.0 with TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui components
- Zustand for state management
- React Query for server state

**Backend:**
- Node.js with Express
- TypeScript
- Supabase (PostgreSQL + Auth)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# Run development servers
npm run dev
```

## Project Structure

```
Product_Consultant_Helper/
├── frontend/          # React application
├── backend/           # Node.js API server
├── docs/             # Project documentation
└── .claude/          # Claude Code configuration
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run dev:frontend` | Start frontend only (port 5173) |
| `npm run dev:backend` | Start backend only (port 3001) |
| `npm run build` | Build both projects |
| `npm run test` | Run frontend tests |

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed technical documentation, architecture patterns, and development guidelines.

## License

MIT
