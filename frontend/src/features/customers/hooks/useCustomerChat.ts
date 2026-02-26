/**
 * useCustomerChat Hook
 *
 * Opens the AppShell chat panel configured for customer AI chat.
 * Routes to either Customer Management or Product Management agent.
 */

import { useCallback } from 'react'
import { useChatLayoutStore } from '@/stores/chatLayoutStore'
import { useCustomerStore } from '../stores/customerStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function useCustomerChat(customerId: string, customerName: string) {
  const openChat = useChatLayoutStore((s) => s.openChat)
  const activeTab = useCustomerStore((s) => s.activeTab)

  const openCustomerChat = useCallback(() => {
    openChat({
      title: `${customerName} AI`,
      contextKey: `customer:${customerId}`,
      endpoint: `${API_URL}/api/ai/customer/chat/stream`,
      screenContext: {
        currentPage: 'customer' as const,
        customerId,
        customerName,
        activeTab: activeTab || 'overview',
      },
      suggestions: [
        { text: "What's the engagement status of this customer?" },
        { text: 'Help me draft a follow-up email' },
        { text: '@product Create a product strategy artifact' },
        { text: 'What agreements are expiring soon?' },
      ],
    })
  }, [customerId, customerName, activeTab, openChat])

  return { openCustomerChat }
}
