/**
 * Data Migration Service
 *
 * Reassigns all data from the placeholder UUID to a real authenticated user.
 * Called from the auth controller after first successful login.
 *
 * Uses supabaseAdmin (service role) intentionally — this service needs to
 * read and update placeholder-owned data that RLS would otherwise block.
 * Idempotent: safe to call multiple times.
 */

import { supabaseAdmin } from '../lib/supabase.js'
import { logger } from '../lib/logger.js'

const PLACEHOLDER_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function migrateDataToUser(realUserId: string): Promise<{
  migrated: boolean
  tablesUpdated: string[]
}> {
  // Guard: check if any placeholder data exists before proceeding
  const { data: check } = await supabaseAdmin
    .from('artifacts')
    .select('id')
    .eq('user_id', PLACEHOLDER_USER_ID)
    .limit(1)

  if (!check || check.length === 0) {
    return { migrated: false, tablesUpdated: [] }
  }

  const tablesUpdated: string[] = []

  // Tables with direct user_id column
  const directTables = [
    'artifacts',
    'ai_conversations',
    'user_context',
    'skills',
    'style_examples',
    'user_preferences',
    'user_writing_examples',
  ]

  for (const table of directTables) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .update({ user_id: realUserId })
      .eq('user_id', PLACEHOLDER_USER_ID)
      .select('id')

    if (error) {
      logger.warn(`[DataMigration] Failed to migrate ${table}`, {
        table,
        hasError: true,
      })
      continue
    }

    if (data && data.length > 0) {
      tablesUpdated.push(`${table} (${data.length} rows)`)
    }
  }

  // Child tables (artifact_research, artifact_interviews, artifact_writing_characteristics)
  // are linked via artifact_id -> artifacts.user_id, so they inherit via the join
  // No direct update needed — the parent artifacts.user_id change propagates through RLS

  logger.info('[DataMigration] Migration completed', {
    migrated: tablesUpdated.length > 0,
    tableCount: tablesUpdated.length,
  })

  return {
    migrated: tablesUpdated.length > 0,
    tablesUpdated,
  }
}
