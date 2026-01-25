# Zustand State Management Review

**Reviewed Documents**:
1. contract.md
2. prd-portfolio-mvp.md
3. architecture-options.md
4. spec-portfolio-mvp.md

**Review Date**: 2026-01-22
**Zustand Version**: 5.0.10

---

## Executive Summary

The spec demonstrates solid foundational understanding of Zustand but contains **6 issues** that should be addressed before implementation. The most critical are the missing hydration handling pattern and potential infinite render risks from selector patterns.

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 2 | Hydration mismatch risk, infinite render risk |
| Medium | 3 | Missing useShallow, no devtools, generic storage keys |
| Low | 1 | Missing partialize optimization |

---

## Issue #1: Missing Hydration Pattern (Critical)

**Location**: [spec-portfolio-mvp.md:1154-1171](spec-portfolio-mvp.md#L1154-L1171), [spec-portfolio-mvp.md:1190-1212](spec-portfolio-mvp.md#L1190-L1212)

**Current Implementation**:
```typescript
export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      // ...state
    }),
    {
      name: 'portfolio-store',
    }
  )
);
```

**Problem**: When using `persist` middleware, the store reads from localStorage on mount. If any component renders state that depends on persisted values before hydration completes, you get a flash of default state or (in SSR scenarios) hydration mismatches.

**Recommended Fix**:
```typescript
interface PortfolioState {
  // State
  selectedArtifactId: string | null;
  interactionMode: 'chat' | 'inline' | 'direct';
  artifactFilters: { type?: string; status?: string };

  // Hydration flag
  _hasHydrated: boolean;

  // Actions
  setSelectedArtifact: (id: string | null) => void;
  setInteractionMode: (mode: 'chat' | 'inline' | 'direct') => void;
  setArtifactFilters: (filters: { type?: string; status?: string }) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      selectedArtifactId: null,
      interactionMode: 'chat',
      artifactFilters: {},
      _hasHydrated: false,

      setSelectedArtifact: (id) => set({ selectedArtifactId: id }),
      setInteractionMode: (mode) => set({ interactionMode: mode }),
      setArtifactFilters: (filters) => set({ artifactFilters: filters }),
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: 'portfolio-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Usage in components that depend on persisted state:
function InteractionModeSelector() {
  const hasHydrated = usePortfolioStore((state) => state._hasHydrated);
  const interactionMode = usePortfolioStore((state) => state.interactionMode);

  if (!hasHydrated) {
    return <Skeleton className="h-10 w-32" />; // Loading state
  }

  return <Select value={interactionMode} ... />;
}
```

**Why This Matters**: Without hydration handling, users may see the wrong interaction mode briefly on page load, then watch it "jump" to their saved preference. This creates a poor UX.

---

## Issue #2: Infinite Render Risk in Chat Store (Critical)

**Location**: [spec-portfolio-mvp.md:1190-1212](spec-portfolio-mvp.md#L1190-L1212)

**Current Implementation**:
```typescript
interface ChatState {
  messages: Record<string, Message[]>;
  setMessages: (contextId: string, messages: Message[]) => void;
  // ...
}
```

**Problem**: If a component selects `messages[contextId]` like this:

```typescript
// WRONG - creates new object reference every render
const messages = useChatStore((state) => state.messages[contextId] || []);
```

The `|| []` creates a new empty array on every render when `contextId` doesn't exist, causing infinite re-renders.

**Recommended Fixes**:

**Option A - Use stable default outside selector**:
```typescript
const EMPTY_MESSAGES: Message[] = [];

function ChatPanel({ contextId }: { contextId: string }) {
  const messages = useChatStore(
    (state) => state.messages[contextId] ?? EMPTY_MESSAGES
  );
}
```

**Option B - Initialize contextId in store before use**:
```typescript
interface ChatState {
  messages: Record<string, Message[]>;
  initContext: (contextId: string) => void;  // Add this
  setMessages: (contextId: string, messages: Message[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: {},

      initContext: (contextId) => {
        if (!get().messages[contextId]) {
          set((state) => ({
            messages: { ...state.messages, [contextId]: [] },
          }));
        }
      },

      setMessages: (contextId, messages) =>
        set((state) => ({
          messages: { ...state.messages, [contextId]: messages },
        })),
    }),
    { name: 'chat-store' }
  )
);

// In component:
useEffect(() => {
  chatStore.initContext(contextId);
}, [contextId]);
```

---

## Issue #3: Missing useShallow for Multi-Value Selection (Medium)

**Location**: [spec-portfolio-mvp.md:1154-1171](spec-portfolio-mvp.md#L1154-L1171)

**Problem**: When components need multiple values from the store, individual selectors are verbose. The spec doesn't mention `useShallow` which is the recommended Zustand v5 pattern.

**Current Approach** (implied):
```typescript
// Verbose - 4 hook calls
const selectedArtifactId = usePortfolioStore((s) => s.selectedArtifactId);
const interactionMode = usePortfolioStore((s) => s.interactionMode);
const setSelectedArtifact = usePortfolioStore((s) => s.setSelectedArtifact);
const setInteractionMode = usePortfolioStore((s) => s.setInteractionMode);
```

**Recommended Pattern**:
```typescript
import { useShallow } from 'zustand/shallow';

// Clean - 1 hook call, no infinite render risk
const { selectedArtifactId, interactionMode, setSelectedArtifact, setInteractionMode } =
  usePortfolioStore(
    useShallow((state) => ({
      selectedArtifactId: state.selectedArtifactId,
      interactionMode: state.interactionMode,
      setSelectedArtifact: state.setSelectedArtifact,
      setInteractionMode: state.setInteractionMode,
    }))
  );
```

**Add to Spec**: Document `useShallow` as the standard pattern for selecting multiple values.

---

## Issue #4: No DevTools Integration (Medium)

**Location**: [spec-portfolio-mvp.md:1130-1212](spec-portfolio-mvp.md#L1130-L1212)

**Problem**: Both stores use only `persist` middleware. For development, `devtools` middleware enables Redux DevTools integration, which is invaluable for debugging state changes.

**Recommended Fix**:
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    persist(
      (set) => ({
        // ...state and actions
      }),
      { name: 'portfolio-store' }
    ),
    { name: 'PortfolioStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
```

**Note**: Middleware order matters - `devtools` should wrap `persist` (outermost).

---

## Issue #5: Generic Storage Key Names (Medium)

**Location**: [spec-portfolio-mvp.md:1168](spec-portfolio-mvp.md#L1168), [spec-portfolio-mvp.md:1209](spec-portfolio-mvp.md#L1209)

**Current**:
```typescript
{ name: 'portfolio-store' }
{ name: 'chat-store' }
```

**Problem**: These generic names could conflict with other applications on the same domain during development (localhost) or if the user has other apps with similar stores.

**Recommended Fix**:
```typescript
// Use app-specific prefix
{ name: 'consulting-toolkit:portfolio' }
{ name: 'consulting-toolkit:chat' }

// Or use a constant
const STORAGE_PREFIX = 'ct';  // consulting-toolkit
{ name: `${STORAGE_PREFIX}:portfolio` }
```

---

## Issue #6: Missing Partialize for Persist Optimization (Low)

**Location**: [spec-portfolio-mvp.md:1154-1171](spec-portfolio-mvp.md#L1154-L1171)

**Problem**: The stores persist all state including `selectedArtifactId` and `selectedTopicId` which are session-specific selections. These shouldn't persist across browser sessions.

**Recommended Fix**:
```typescript
export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      // Session-only state (not persisted)
      selectedArtifactId: null,
      selectedTopicId: null,

      // Persisted state
      interactionMode: 'chat',
      artifactFilters: {},
      _hasHydrated: false,

      // Actions...
    }),
    {
      name: 'consulting-toolkit:portfolio',
      partialize: (state) => ({
        // Only persist user preferences, not session selections
        interactionMode: state.interactionMode,
        artifactFilters: state.artifactFilters,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
```

---

## Additional Recommendations

### 1. Add Error Handling for Storage Failures

localStorage can fail (private browsing, quota exceeded, etc.). Add error handling:

```typescript
import { persist, createJSONStorage } from 'zustand/middleware';

const storage = createJSONStorage(() => localStorage, {
  reviver: (key, value) => value,
  replacer: (key, value) => value,
});

// In persist config:
{
  name: 'consulting-toolkit:portfolio',
  storage,
  onRehydrateStorage: () => (state, error) => {
    if (error) {
      console.error('Failed to rehydrate portfolio store:', error);
      // Optionally: reset to defaults or show user notification
    }
    state?.setHasHydrated(true);
  },
}
```

### 2. Consider Store Reset Functionality

For development and testing, add reset capability:

```typescript
interface PortfolioState {
  // ... existing
  reset: () => void;
}

const initialState = {
  selectedArtifactId: null,
  selectedTopicId: null,
  interactionMode: 'chat' as const,
  artifactFilters: {},
  _hasHydrated: false,
};

// In store:
reset: () => set(initialState),
```

### 3. Type-Safe Selector Hooks

Create pre-defined selector hooks for common access patterns:

```typescript
// frontend/src/features/portfolio/stores/portfolioSelectors.ts

export const useInteractionMode = () =>
  usePortfolioStore((state) => state.interactionMode);

export const useSetInteractionMode = () =>
  usePortfolioStore((state) => state.setInteractionMode);

export const usePortfolioUI = () =>
  usePortfolioStore(
    useShallow((state) => ({
      selectedArtifactId: state.selectedArtifactId,
      interactionMode: state.interactionMode,
      isHydrated: state._hasHydrated,
    }))
  );
```

---

## Corrected Store Implementations

### portfolioStore.ts (Corrected)

```typescript
// frontend/src/features/portfolio/stores/portfolioStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface PortfolioState {
  // Session state (not persisted)
  selectedArtifactId: string | null;
  selectedTopicId: string | null;

  // Persisted preferences
  interactionMode: 'chat' | 'inline' | 'direct';
  artifactFilters: { type?: string; status?: string };

  // Hydration
  _hasHydrated: boolean;

  // Actions
  setSelectedArtifact: (id: string | null) => void;
  setSelectedTopic: (id: string | null) => void;
  setInteractionMode: (mode: 'chat' | 'inline' | 'direct') => void;
  setArtifactFilters: (filters: { type?: string; status?: string }) => void;
  setHasHydrated: (hydrated: boolean) => void;
  reset: () => void;
}

const initialState = {
  selectedArtifactId: null,
  selectedTopicId: null,
  interactionMode: 'chat' as const,
  artifactFilters: {},
  _hasHydrated: false,
};

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setSelectedArtifact: (id) => set({ selectedArtifactId: id }),
        setSelectedTopic: (id) => set({ selectedTopicId: id }),
        setInteractionMode: (mode) => set({ interactionMode: mode }),
        setArtifactFilters: (filters) => set({ artifactFilters: filters }),
        setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
        reset: () => set(initialState),
      }),
      {
        name: 'consulting-toolkit:portfolio',
        partialize: (state) => ({
          interactionMode: state.interactionMode,
          artifactFilters: state.artifactFilters,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            console.error('Portfolio store rehydration failed:', error);
          }
          state?.setHasHydrated(true);
        },
      }
    ),
    { name: 'PortfolioStore', enabled: import.meta.env.DEV }
  )
);
```

### chatStore.ts (Corrected)

```typescript
// frontend/src/features/portfolio/stores/chatStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Message } from '@ai-sdk/react';

// Stable empty array to prevent infinite renders
const EMPTY_MESSAGES: Message[] = [];

interface ChatState {
  messages: Record<string, Message[]>;
  _hasHydrated: boolean;

  // Actions
  getMessages: (contextId: string) => Message[];
  setMessages: (contextId: string, messages: Message[]) => void;
  clearMessages: (contextId: string) => void;
  clearAllMessages: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        messages: {},
        _hasHydrated: false,

        getMessages: (contextId) => get().messages[contextId] ?? EMPTY_MESSAGES,

        setMessages: (contextId, messages) =>
          set((state) => ({
            messages: { ...state.messages, [contextId]: messages },
          })),

        clearMessages: (contextId) =>
          set((state) => {
            const { [contextId]: _, ...rest } = state.messages;
            return { messages: rest };
          }),

        clearAllMessages: () => set({ messages: {} }),
        setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      }),
      {
        name: 'consulting-toolkit:chat',
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            console.error('Chat store rehydration failed:', error);
          }
          state?.setHasHydrated(true);
        },
      }
    ),
    { name: 'ChatStore', enabled: import.meta.env.DEV }
  )
);

// Safe selector hook - prevents infinite render
export const useChatMessages = (contextId: string) => {
  const getMessages = useChatStore((state) => state.getMessages);
  return getMessages(contextId);
};
```

---

## Architecture Review Comments

### From architecture-options.md

The document correctly identifies:
- "Zustand + Supabase for state" - Fast UI cache + permanent persistence

This is the right approach. Zustand handles:
- Immediate UI state (selections, filters, mode preferences)
- Fast client-side cache for chat messages

Supabase handles:
- Permanent persistence (ai_conversations table)
- Cross-device sync
- Data that survives browser storage clearing

### Recommendation: Sync Strategy

Add a sync layer that periodically persists Zustand chat state to Supabase:

```typescript
// Debounced sync to Supabase every 30 seconds
useEffect(() => {
  const sync = debounce(async () => {
    const messages = useChatStore.getState().messages[contextId];
    if (messages?.length) {
      await supabase
        .from('ai_conversations')
        .upsert({ artifact_id: contextId, messages });
    }
  }, 30000);

  const unsubscribe = useChatStore.subscribe(
    (state) => state.messages[contextId],
    sync
  );

  return () => unsubscribe();
}, [contextId]);
```

---

## Summary Checklist

Before implementation, ensure:

- [ ] Add `_hasHydrated` flag and `onRehydrateStorage` callback to all persisted stores
- [ ] Use stable default values (const outside selector) for optional record lookups
- [ ] Document `useShallow` as the standard pattern for multi-value selection
- [ ] Add `devtools` middleware (disabled in production)
- [ ] Use app-specific storage key prefix (`consulting-toolkit:`)
- [ ] Add `partialize` to exclude session-only state from persistence
- [ ] Add error handling in `onRehydrateStorage`
- [ ] Create typed selector hooks for common patterns
- [ ] Document Zustand ↔ Supabase sync strategy for chat messages

---

*This review was conducted using Zustand 5.0.10 best practices. All recommendations are compatible with React 19 and the existing tech stack.*
