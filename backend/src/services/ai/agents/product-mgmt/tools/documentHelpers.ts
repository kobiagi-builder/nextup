// @ts-nocheck
/**
 * Shared helpers for PM capability tools.
 *
 * createDocumentWithEvent — inserts a customer_document row and auto-logs
 * a delivery event. Event logging failure does not fail the document.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolve a valid initiative ID for the customer.
 * If initiativeId is provided and exists, returns it.
 * Otherwise picks the first active initiative, or creates a "General" initiative.
 */
export async function resolveInitiativeId(
  supabase: SupabaseClient,
  customerId: string,
  initiativeId?: string,
): Promise<{ id: string; wasCreated: boolean }> {
  // If provided, verify it exists
  if (initiativeId) {
    const { data } = await supabase
      .from('customer_initiatives')
      .select('id')
      .eq('id', initiativeId)
      .eq('customer_id', customerId)
      .single()

    if (data) return { id: data.id, wasCreated: false }
  }

  // Try to find an existing active initiative
  const { data: initiatives } = await supabase
    .from('customer_initiatives')
    .select('id')
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)

  if (initiatives && initiatives.length > 0) {
    return { id: initiatives[0].id, wasCreated: false }
  }

  // Try any initiative regardless of status
  const { data: anyInitiative } = await supabase
    .from('customer_initiatives')
    .select('id')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (anyInitiative && anyInitiative.length > 0) {
    return { id: anyInitiative[0].id, wasCreated: false }
  }

  // No initiatives exist — create a default "General" initiative
  const { data: newInitiative, error } = await supabase
    .from('customer_initiatives')
    .insert({
      customer_id: customerId,
      name: 'General',
      description: 'Auto-created initiative for meeting notes and general documents',
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !newInitiative) {
    throw new Error(`Failed to create default initiative: ${error?.message}`)
  }

  return { id: newInitiative.id, wasCreated: true }
}

export async function createDocumentWithEvent(
  supabase: SupabaseClient,
  customerId: string,
  params: {
    initiativeId: string
    type: string
    title: string
    content: string
    metadata?: Record<string, unknown>
  },
) {
  const { data, error } = await supabase
    .from('customer_documents')
    .insert({
      initiative_id: params.initiativeId,
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
    documentId: data.id,
    title: params.title,
    type: params.type,
    initiativeId: params.initiativeId,
  }
}
