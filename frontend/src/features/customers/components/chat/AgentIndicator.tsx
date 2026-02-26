/**
 * AgentIndicator — Shows which AI agent is active
 *
 * Blue badge for Customer Mgmt, purple badge for Product Mgmt.
 * Pulse animation when agent type is unknown (routing in progress).
 */

import { cn } from '@/lib/utils'

type AgentType = 'customer_mgmt' | 'product_mgmt'

interface AgentIndicatorProps {
  agentType: AgentType | null
  className?: string
}

const AGENT_CONFIG: Record<AgentType, { label: string; color: string }> = {
  customer_mgmt: { label: 'Customer Mgmt', color: 'bg-blue-500/10 text-blue-400 dark:text-blue-300' },
  product_mgmt: { label: 'Product Mgmt', color: 'bg-purple-500/10 text-purple-400 dark:text-purple-300' },
}

export function AgentIndicator({ agentType, className }: AgentIndicatorProps) {
  if (!agentType) {
    return (
      <span className={cn('text-xs px-2 py-0.5 rounded-full bg-muted animate-pulse', className)}>
        ...
      </span>
    )
  }

  const config = AGENT_CONFIG[agentType]

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', config.color, className)}>
      {config.label}
    </span>
  )
}
