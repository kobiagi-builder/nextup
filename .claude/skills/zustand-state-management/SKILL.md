---
name: zustand-state-management
description: |
  Build type-safe global state in React with Zustand. Supports TypeScript, persist middleware, devtools, slices pattern, and Next.js SSR with hydration handling. Prevents 6 documented errors.

  Use when setting up React state, migrating from Redux/Context, or troubleshooting hydration errors, TypeScript inference, infinite render loops, or persist race conditions.
user-invocable: true
---

# Zustand State Management

**Last Updated**: 2026-01-21
**Latest Version**: zustand@5.0.10 (released 2026-01-12)
**Dependencies**: React 18-19, TypeScript 5+

---

## Quick Start

```bash
npm install zustand
```

**TypeScript Store** (CRITICAL: use `create<T>()()` double parentheses):
```typescript
import { create } from 'zustand'

interface BearStore {
  bears: number
  increase: (by: number) => void
}

const useBearStore = create<BearStore>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
}))
```

**Use in Components**:
```tsx
const bears = useBearStore((state) => state.bears)  // Only re-renders when bears changes
const increase = useBearStore((state) => state.increase)
```

---

## Core Patterns

**Basic Store** (JavaScript):
```javascript
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))
```

**TypeScript Store** (Recommended):
```typescript
interface CounterStore { count: number; increment: () => void }
const useStore = create<CounterStore>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))
```

**Persistent Store** (survives page reloads):
```typescript
import { persist, createJSONStorage } from 'zustand/middleware'

const useStore = create<UserPreferences>()(
  persist(
    (set) => ({ theme: 'system', setTheme: (theme) => set({ theme }) }),
    { name: 'user-preferences', storage: createJSONStorage(() => localStorage) },
  ),
)
```

---

## Critical Rules

### Always Do

✅ Use `create<T>()()` (double parentheses) in TypeScript for middleware compatibility
✅ Define separate interfaces for state and actions
✅ Use selector functions to extract specific state slices
✅ Use `set` with updater functions for derived state: `set((state) => ({ count: state.count + 1 }))`
✅ Use unique names for persist middleware storage keys
✅ Handle Next.js hydration with `hasHydrated` flag pattern
✅ Use `useShallow` hook for selecting multiple values
✅ Keep actions pure (no side effects except state updates)

### Never Do

❌ Use `create<T>(...)` (single parentheses) in TypeScript - breaks middleware types
❌ Mutate state directly: `set((state) => { state.count++; return state })` - use immutable updates
❌ Create new objects in selectors: `useStore((state) => ({ a: state.a }))` - causes infinite renders
❌ Use same storage name for multiple stores - causes data collisions
❌ Access localStorage during SSR without hydration check
❌ Use Zustand for server state - use TanStack Query instead
❌ Export store instance directly - always export the hook

---

## Known Issues Prevention

This skill prevents **6** documented issues:

### Issue #1: Next.js Hydration Mismatch

**Error**: `"Text content does not match server-rendered HTML"` or `"Hydration failed"`

**Why It Happens**:
Persist middleware reads from localStorage on client but not on server, causing state mismatch.

**Prevention**:
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StoreWithHydration {
  count: number
  _hasHydrated: boolean
  setHasHydrated: (hydrated: boolean) => void
  increase: () => void
}

const useStore = create<StoreWithHydration>()(
  persist(
    (set) => ({
      count: 0,
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      increase: () => set((state) => ({ count: state.count + 1 })),
    }),
    {
      name: 'my-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)

// In component
function MyComponent() {
  const hasHydrated = useStore((state) => state._hasHydrated)

  if (!hasHydrated) {
    return <div>Loading...</div>
  }

  return <ActualContent />
}
```

### Issue #2: TypeScript Double Parentheses Missing

**Error**: Type inference fails, `StateCreator` types break with middleware

**Prevention**:
```typescript
// ❌ WRONG - Single parentheses
const useStore = create<MyStore>((set) => ({
  // ...
}))

// ✅ CORRECT - Double parentheses
const useStore = create<MyStore>()((set) => ({
  // ...
}))
```

### Issue #3: Persist Middleware Import Error

**Error**: `"Attempted import error: 'createJSONStorage' is not exported from 'zustand/middleware'"`

**Prevention**:
```typescript
// ✅ CORRECT imports for v5
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
```

### Issue #4: Infinite Render Loop

**Error**: Component re-renders infinitely, browser freezes

**Prevention**:
```typescript
import { useShallow } from 'zustand/shallow'

// ❌ WRONG - Creates new object every time
const { bears, fishes } = useStore((state) => ({
  bears: state.bears,
  fishes: state.fishes,
}))

// ✅ CORRECT Option 1 - Select primitives separately
const bears = useStore((state) => state.bears)
const fishes = useStore((state) => state.fishes)

// ✅ CORRECT Option 2 - Use useShallow hook for multiple values
const { bears, fishes } = useStore(
  useShallow((state) => ({ bears: state.bears, fishes: state.fishes }))
)
```

### Issue #5: Slices Pattern TypeScript Complexity

**Prevention**:
```typescript
import { create, StateCreator } from 'zustand'

interface BearSlice {
  bears: number
  addBear: () => void
}

interface FishSlice {
  fishes: number
  addFish: () => void
}

const createBearSlice: StateCreator<
  BearSlice & FishSlice,
  [],
  [],
  BearSlice
> = (set) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
})

const createFishSlice: StateCreator<
  BearSlice & FishSlice,
  [],
  [],
  FishSlice
> = (set) => ({
  fishes: 0,
  addFish: () => set((state) => ({ fishes: state.fishes + 1 })),
})

const useStore = create<BearSlice & FishSlice>()((...a) => ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}))
```

### Issue #6: Persist Middleware Race Condition

**Prevention**: Upgrade to Zustand v5.0.10 or later.

```bash
npm install zustand@latest  # Ensure v5.0.10+
```

---

## Middleware

**Persist** (localStorage):
```typescript
import { persist, createJSONStorage } from 'zustand/middleware'

const useStore = create<MyStore>()(
  persist(
    (set) => ({ data: [], addItem: (item) => set((state) => ({ data: [...state.data, item] })) }),
    {
      name: 'my-storage',
      partialize: (state) => ({ data: state.data }),
    },
  ),
)
```

**Devtools** (Redux DevTools):
```typescript
import { devtools } from 'zustand/middleware'

const useStore = create<CounterStore>()(
  devtools(
    (set) => ({ count: 0, increment: () => set((s) => ({ count: s.count + 1 }), undefined, 'increment') }),
    { name: 'CounterStore' },
  ),
)
```

**Combining Middlewares** (order matters):
```typescript
const useStore = create<MyStore>()(devtools(persist((set) => ({ /* ... */ }), { name: 'storage' }), { name: 'MyStore' }))
```

---

## Common Patterns

**Computed/Derived Values** (in selector, not stored):
```typescript
const count = useStore((state) => state.items.length)
```

**Async Actions**:
```typescript
const useAsyncStore = create<AsyncStore>()((set) => ({
  data: null,
  isLoading: false,
  fetchData: async () => {
    set({ isLoading: true })
    const response = await fetch('/api/data')
    set({ data: await response.text(), isLoading: false })
  },
}))
```

**Resetting Store**:
```typescript
const initialState = { count: 0, name: '' }
const useStore = create<ResettableStore>()((set) => ({
  ...initialState,
  reset: () => set(initialState),
}))
```

---

## Official Documentation

- **Zustand**: https://zustand.docs.pmnd.rs/
- **GitHub**: https://github.com/pmndrs/zustand
- **TypeScript Guide**: https://zustand.docs.pmnd.rs/guides/typescript
