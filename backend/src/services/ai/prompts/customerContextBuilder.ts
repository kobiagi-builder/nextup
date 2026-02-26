/**
 * Customer Context Builder
 *
 * Assembles the full customer profile into a structured text block
 * for injection into system prompts. Enforces a ~3000 token budget
 * with priority-based truncation (events first, then projects, then agreement details).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../../../lib/logger.js'

/** Rough token estimation: ~4 chars per token */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Compute health signals from customer data.
 * Returns an array of human-readable warning strings.
 */
function computeHealthSignals(
  agreements: any[],
  receivables: any[],
  events: any[],
): string[] {
  const signals: string[] = []
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Expiring agreements (end_date within 30 days, not terminated/suspended)
  const expiring = agreements.filter(a => {
    if (a.override_status === 'terminated' || a.override_status === 'suspended') return false
    if (!a.end_date) return false
    const end = new Date(a.end_date)
    return end >= now && end <= thirtyDaysFromNow
  })
  if (expiring.length > 0) {
    signals.push(`\u26A0\uFE0F ${expiring.length} agreement(s) expiring within 30 days`)
  }

  // Overdue invoices
  const overdue = receivables.filter((r: any) => r.type === 'invoice' && r.status === 'overdue')
  if (overdue.length > 0) {
    const total = overdue.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
    signals.push(`\u26A0\uFE0F ${overdue.length} overdue invoice(s) totaling $${total.toFixed(2)}`)
  }

  // Inactivity (no events in last 14 days)
  const lastEvent = events.length > 0 ? new Date(events[0].event_date) : null
  if (!lastEvent || lastEvent < fourteenDaysAgo) {
    const daysInactive = lastEvent
      ? Math.floor((now.getTime() - lastEvent.getTime()) / (1000 * 60 * 60 * 24))
      : null
    signals.push(
      daysInactive
        ? `\u26A0\uFE0F No activity in ${daysInactive} days`
        : '\u26A0\uFE0F No recorded interactions'
    )
  }

  return signals
}

/**
 * Build a structured customer context string for AI system prompts.
 * Fetches all customer data in parallel and assembles into a readable text block.
 */
export async function buildCustomerContext(
  customerId: string,
  supabase: SupabaseClient,
  tokenBudget: number = 3000
): Promise<string> {
  const [customerResult, agreementsResult, receivablesResult, projectsResult, eventsResult, artifactsResult, actionItemsResult] = await Promise.all([
    supabase.from('customers').select('*').eq('id', customerId).single(),
    supabase.from('customer_agreements').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
    supabase.from('customer_receivables').select('type, amount, status').eq('customer_id', customerId),
    supabase.from('customer_projects').select('id, name, status, description, agreement_id').eq('customer_id', customerId).order('updated_at', { ascending: false }),
    supabase.from('customer_events').select('*').eq('customer_id', customerId).order('event_date', { ascending: false }).limit(10),
    supabase.from('customer_artifacts').select('title, type, status').eq('customer_id', customerId).order('updated_at', { ascending: false }).limit(10),
    supabase.from('customer_action_items').select('id, type, description, due_date, status').eq('customer_id', customerId).in('status', ['todo', 'in_progress']).order('due_date', { ascending: true, nullsFirst: false }).limit(10),
  ])

  if (customerResult.error || !customerResult.data) {
    logger.error('[CustomerContextBuilder] Failed to fetch customer', {
      sourceCode: 'buildCustomerContext',
      hasError: !!customerResult.error,
    })
    return '## Current Customer Context\n\nCustomer data could not be loaded.'
  }

  const customer = customerResult.data
  const agreements = agreementsResult.data || []
  const receivables = receivablesResult.data || []
  const projects = projectsResult.data || []
  const events = eventsResult.data || []
  const artifacts = artifactsResult.data || []
  const actionItems = actionItemsResult.data || []

  // Compute financial summary
  const totalInvoiced = receivables
    .filter((r: any) => r.type === 'invoice')
    .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
  const totalPaid = receivables
    .filter((r: any) => r.type === 'payment')
    .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
  const balance = totalInvoiced - totalPaid

  // Compute health signals
  const healthSignals = computeHealthSignals(agreements, receivables, events)

  const info = customer.info || {}
  const team: Array<{ name: string; role?: string; notes?: string }> = info.team || []

  function buildContext(
    eventSlice: typeof events,
    projectSlice: typeof projects,
    agreementSlice: typeof agreements,
    artifactSlice: typeof artifacts,
    actionItemSlice: typeof actionItems,
  ): string {
    const teamBlock = team.length > 0
      ? team.map(t => `- ${t.name} (${t.role || 'No role'})${t.notes ? ` - ${t.notes}` : ''}`).join('\n')
      : '- No team members listed'

    const agreementsBlock = agreementSlice.length > 0
      ? agreementSlice.map(a => {
          const pricing = a.pricing ? ` | $${a.pricing.amount || '?'} ${a.pricing.currency || ''} ${a.pricing.frequency || ''}` : ''
          return `- ${a.scope || 'Untitled'} | ${a.type || 'unspecified'} | ${a.start_date || '?'} - ${a.end_date || 'Ongoing'}${pricing}${a.override_status === 'terminated' ? ' [TERMINATED]' : ''}`
        }).join('\n')
      : '- No agreements'

    const projectsBlock = projectSlice.length > 0
      ? projectSlice.map(p => `- ${p.name} (${p.status})${p.description ? ` - ${p.description.slice(0, 80)}` : ''}`).join('\n')
      : '- No projects'

    const eventsBlock = eventSlice.length > 0
      ? eventSlice.map(e => `- [${e.event_date?.slice(0, 10) || '?'}] ${e.event_type}: ${e.title}`).join('\n')
      : '- No recent events'

    const healthBlock = healthSignals.length > 0
      ? healthSignals.map(s => `- ${s}`).join('\n')
      : '- No concerns'

    const artifactsBlock = artifactSlice.length > 0
      ? artifactSlice.map((a: any) => `- ${a.title} (${a.type}, ${a.status})`).join('\n')
      : '- No artifacts'

    const actionItemsBlock = actionItemSlice.length > 0
      ? actionItemSlice.map((ai: any) => `- [${ai.type}] ${ai.description}${ai.due_date ? ` (due: ${ai.due_date})` : ''} [${ai.status}]`).join('\n')
      : '- No pending action items'

    return `## Current Customer Context

**Today's Date**: ${new Date().toISOString().split('T')[0]}

**Customer**: ${customer.name}
**Customer ID**: ${customer.id}
**Status**: ${customer.status}
**Vertical**: ${info.vertical || 'Not specified'}
**Persona**: ${info.persona || 'Not specified'}
**ICP**: ${info.icp || 'Not specified'}

**About**: ${info.about || 'No description'}

**Product**: ${info.product || 'No product details'}

**Team**:
${teamBlock}

**Agreements** (${agreements.length}):
${agreementsBlock}

**Financial Summary**:
- Total Invoiced: $${totalInvoiced.toFixed(2)}
- Total Paid: $${totalPaid.toFixed(2)}
- Outstanding: $${balance.toFixed(2)}

**Health Signals**:
${healthBlock}

**Action Items** (${actionItemSlice.length} pending):
${actionItemsBlock}

**Active Projects** (${projects.length}):
${projectsBlock}

**Deliverables** (${artifacts.length} total):
${artifactsBlock}

**Recent Events** (last ${eventSlice.length}):
${eventsBlock}`.trim()
  }

  // Build full context first
  let context = buildContext(events, projects, agreements, artifacts, actionItems)

  // Enforce token budget with progressive truncation
  if (estimateTokens(context) > tokenBudget) {
    // Round 1: Truncate events to 3
    context = buildContext(events.slice(0, 3), projects, agreements, artifacts, actionItems)
  }
  if (estimateTokens(context) > tokenBudget) {
    // Round 2: Truncate projects to 5, artifacts to 5, action items to 5
    context = buildContext(events.slice(0, 3), projects.slice(0, 5), agreements, artifacts.slice(0, 5), actionItems.slice(0, 5))
  }
  if (estimateTokens(context) > tokenBudget) {
    // Round 3: Truncate agreements to 3, action items to 3
    context = buildContext(events.slice(0, 3), projects.slice(0, 5), agreements.slice(0, 3), artifacts.slice(0, 5), actionItems.slice(0, 3))
  }

  logger.debug('[CustomerContextBuilder] Context built', {
    estimatedTokens: estimateTokens(context),
    agreementCount: agreements.length,
    projectCount: projects.length,
    eventCount: events.length,
  })

  return context
}
