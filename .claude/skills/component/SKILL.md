---
name: component
description: Create a new React component following project patterns with TypeScript, shadcn/ui, and proper structure
argument-hint: <ComponentName> [--feature <feature-name>]
---

# Create React Component

Create a new React component following project conventions.

## Arguments

$ARGUMENTS

Parse the arguments:
- First argument: Component name (PascalCase)
- `--feature <name>`: Place in `src/features/<name>/` instead of `src/components/`

## Component Template

```tsx
import { cn } from '@/lib/utils'

interface ${ComponentName}Props {
  className?: string
  // Add props here
}

export function ${ComponentName}({ className, ...props }: ${ComponentName}Props) {
  return (
    <div className={cn('', className)} {...props}>
      {/* Component content */}
    </div>
  )
}
```

## Rules

1. **TypeScript**: Always define a props interface named `${ComponentName}Props`
2. **Styling**: Use `cn()` from `@/lib/utils` for className merging
3. **shadcn/ui**: Import from `@/components/ui/` when using Button, Card, Input, etc.
4. **Location**:
   - Shared components → `src/components/`
   - Feature components → `src/features/<feature-name>/`
5. **Naming**: Use PascalCase for component names and files
6. **Exports**: Use named exports (not default)

## After Creation

1. Show the created file path
2. Suggest any shadcn/ui components that might be useful
3. Ask if tests are needed
