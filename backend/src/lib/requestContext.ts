/**
 * Request Context — AsyncLocalStorage for request-scoped Supabase client
 *
 * Provides per-request user-scoped Supabase client so that RLS policies
 * are enforced on all data queries. The requireAuth middleware sets up
 * the context; all downstream code (controllers, services, AI tools)
 * calls getSupabase() instead of importing supabaseAdmin directly.
 *
 * supabaseAdmin is still used for system operations:
 * - Auth token verification (middleware/auth.ts)
 * - Health checks (routes/health.ts)
 * - Data migration (services/dataMigration.ts)
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { SupabaseClient } from '@supabase/supabase-js'

interface RequestContext {
  supabase: SupabaseClient
  userId: string
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>()

/**
 * Get the user-scoped Supabase client for the current request.
 * Throws if called outside of a request context (i.e., without requireAuth middleware).
 */
export function getSupabase(): SupabaseClient {
  const store = requestContextStorage.getStore()
  if (!store) {
    throw new Error(
      'getSupabase() called outside of request context. ' +
      'Ensure requireAuth middleware is applied to this route. ' +
      'For system operations, use supabaseAdmin directly.'
    )
  }
  return store.supabase
}

/**
 * Get the authenticated user's ID for the current request.
 * Throws if called outside of a request context.
 */
export function getUserId(): string {
  const store = requestContextStorage.getStore()
  if (!store) {
    throw new Error(
      'getUserId() called outside of request context. ' +
      'Ensure requireAuth middleware is applied to this route.'
    )
  }
  return store.userId
}
