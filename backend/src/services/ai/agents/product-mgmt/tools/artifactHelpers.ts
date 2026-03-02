// @ts-nocheck
/**
 * Shared helpers for PM capability tools.
 *
 * createArtifactWithEvent — inserts a customer_artifact row and auto-logs
 * a delivery event. Event logging failure does not fail the artifact.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export async function createArtifactWithEvent(
  supabase: SupabaseClient,
  customerId: string,
  params: {
    projectId: string
    type: string
    title: string
    content: string
    metadata?: Record<string, unknown>
  },
) {
  const { data, error } = await supabase
    .from('customer_artifacts')
    .insert({
      project_id: params.projectId,
      customer_id: customerId,
      type: params.type,
      title: params.title,
      content: params.content,
      status: 'draft',
      metadata: params.metadata || null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  await supabase
    .from('customer_events')
    .insert({
      customer_id: customerId,
      event_type: 'delivery',
      title: `Created ${params.type}: ${params.title}`,
      description: `Type: ${params.type}`,
    })
    .catch(() => {})

  return {
    success: true,
    artifactId: data.id,
    title: params.title,
    type: params.type,
    projectId: params.projectId,
  }
}
