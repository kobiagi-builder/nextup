---
name: rollout-management
description: Manage feature rollout flags. Create new flags, enable/disable features for specific accounts, check feature status, and list all flags. Uses the feature_flags and customer_features tables in Supabase.
---

# Rollout Management

Manage feature flags for gradual feature rollout. Control which accounts have access to which features.

## Database Schema

### `feature_flags` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Unique flag name (snake_case) |
| description | TEXT | What this flag controls |
| default_state | BOOLEAN | `true` = enabled for all, `false` = disabled by default |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### `customer_features` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| uid | UUID | User account ID (references auth.users) |
| feature_id | UUID | References feature_flags.id |
| flag_state | BOOLEAN | `true` = enabled, `false` = disabled |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Activation Logic

A feature is **active** for an account if:
- `default_state = true` (enabled for everyone), OR
- `default_state = false` AND `flag_state = true` in `customer_features` for that UID

Helper function: `is_feature_active(p_uid UUID, p_feature_name TEXT) RETURNS BOOLEAN`

## Operations

### 1. Create a New Feature Flag

```sql
INSERT INTO feature_flags (name, description, default_state)
VALUES ('{flag_name}', '{description}', {true/false})
RETURNING id, name, default_state;
```

**Convention**: Use `snake_case` for flag names (e.g., `customer_management`, `analytics_dashboard`).

**Use MCP tool**:
```
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "INSERT INTO feature_flags (name, description, default_state) VALUES ('flag_name', 'Description', false) RETURNING id, name, default_state;"
})
```

### 2. Enable a Feature for Specific Accounts

```sql
INSERT INTO customer_features (uid, feature_id, flag_state)
VALUES ('{uid}', '{feature_flag_id}', true)
ON CONFLICT (uid, feature_id) DO UPDATE SET flag_state = true;
```

**Use MCP tool**:
```
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "INSERT INTO customer_features (uid, feature_id, flag_state) VALUES ('{uid}', (SELECT id FROM feature_flags WHERE name = '{flag_name}'), true) ON CONFLICT (uid, feature_id) DO UPDATE SET flag_state = true;"
})
```

### 3. Disable a Feature for a Specific Account

```sql
UPDATE customer_features
SET flag_state = false
WHERE uid = '{uid}' AND feature_id = (SELECT id FROM feature_flags WHERE name = '{flag_name}');
```

### 4. Enable a Feature for All Accounts (Global Rollout)

```sql
UPDATE feature_flags SET default_state = true WHERE name = '{flag_name}';
```

This makes the feature available to everyone. Per-account overrides in `customer_features` become irrelevant.

### 5. Disable a Feature Globally (Kill Switch)

```sql
UPDATE feature_flags SET default_state = false WHERE name = '{flag_name}';
-- Also disable all per-account overrides
UPDATE customer_features SET flag_state = false
WHERE feature_id = (SELECT id FROM feature_flags WHERE name = '{flag_name}');
```

### 6. Check Feature Status for a User

```sql
SELECT is_feature_active('{uid}', '{flag_name}') as is_active;
```

### 7. List All Feature Flags

```sql
SELECT
  ff.name,
  ff.description,
  ff.default_state,
  COUNT(cf.id) FILTER (WHERE cf.flag_state = true) as enabled_accounts,
  ff.created_at
FROM feature_flags ff
LEFT JOIN customer_features cf ON cf.feature_id = ff.id
GROUP BY ff.id
ORDER BY ff.created_at DESC;
```

### 8. List Accounts Enabled for a Feature

```sql
SELECT cf.uid, cf.flag_state, cf.created_at
FROM customer_features cf
JOIN feature_flags ff ON cf.feature_id = ff.id
WHERE ff.name = '{flag_name}' AND cf.flag_state = true
ORDER BY cf.created_at;
```

### 9. Delete a Feature Flag

```sql
-- This cascades to customer_features entries
DELETE FROM feature_flags WHERE name = '{flag_name}';
```

## Backend Integration Pattern

When checking feature access in backend routes/services:

```typescript
// In a route handler or service
const { data } = await supabase.rpc('is_feature_active', {
  p_uid: userId,
  p_feature_name: 'customer_management'
});

if (!data) {
  throw new ApiError(403, 'Feature not available for your account');
}
```

## Frontend Integration Pattern

```typescript
// Hook to check feature access
const useFeatureFlag = (featureName: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-flag', featureName],
    queryFn: async () => {
      const { data } = await supabase.rpc('is_feature_active', {
        p_uid: userId,
        p_feature_name: featureName
      });
      return data as boolean;
    }
  });
  return { isEnabled: data ?? false, isLoading };
};

// Usage in components
const { isEnabled } = useFeatureFlag('customer_management');
if (!isEnabled) return null; // or redirect
```

## Current Feature Flags

| Flag Name | Description | Default | Enabled Accounts |
|-----------|-------------|---------|-----------------|
| `customer_management` | Customer management platform | `false` | 2 accounts |

## Migration Reference

- Migration file: `backend/src/db/migrations/014_feature_rollout_tables.sql`
- Supabase project: `ohwubfmipnpguunryopl`

## Important Notes

- Always use `mcp__supabase__execute_sql` for data operations
- Use `mcp__supabase__apply_migration` only for DDL changes (schema modifications)
- Flag names must be unique and use `snake_case`
- The `is_feature_active` function is `SECURITY DEFINER` - it bypasses RLS for the lookup
- Deleting a feature flag cascades to all `customer_features` entries
