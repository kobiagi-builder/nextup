/**
 * Customer Store (Zustand)
 *
 * Transient UI state only. Filter/search/sort state lives in URL params.
 * NO persist — this is session-scoped state.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { CustomerTab } from '../types'

interface CustomerStore {
  // Active customer context (for chat integration in Phase 4)
  activeCustomerId: string | null
  activeTab: CustomerTab | null
  setActiveCustomer: (id: string | null) => void
  setActiveTab: (tab: CustomerTab | null) => void

  // Selected project within Projects tab (persists across tab switches)
  selectedProjectIds: Record<string, string | null>
  setSelectedProjectId: (customerId: string, projectId: string | null) => void
}

export const useCustomerStore = create<CustomerStore>()(
  devtools(
    (set) => ({
      activeCustomerId: null,
      activeTab: null,
      setActiveCustomer: (id) => set({ activeCustomerId: id }, false, 'setActiveCustomer'),
      setActiveTab: (tab) => set({ activeTab: tab }, false, 'setActiveTab'),

      selectedProjectIds: {},
      setSelectedProjectId: (customerId, projectId) =>
        set(
          (state) => ({
            selectedProjectIds: { ...state.selectedProjectIds, [customerId]: projectId },
          }),
          false,
          'setSelectedProjectId'
        ),
    }),
    { name: 'CustomerStore' }
  )
)
