/**
 * Filter Store
 *
 * Persistent Zustand store for sticky filter state across screens.
 * Uses localStorage via persist middleware so filters survive browser refresh.
 * Following UX best practice (NNGroup, Baymard): users expect filters to persist.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// --- Filter shape per screen ---

interface ActionItemsBoardFilters {
  customerId?: string
  types: string[]
  searchQuery: string
}

interface CustomerActionItemsFilters {
  status: string[]
  type: string[]
  sortBy: 'due_date' | 'created_at'
}

interface CustomerDocumentsFilters {
  initiativeStatus: string[]
  documentStatus: string[]
  nameSearch: string
}

interface PortfolioFilters {
  typeFilter: string
  statusFilter: string
  searchQuery: string
}

interface ContentFilters {
  typeFilter: string
  statusFilter: string
}

interface SkillsFilters {
  categoryFilter: string
}

// --- Defaults ---

const DEFAULT_CUSTOMER_ACTION_ITEMS: CustomerActionItemsFilters = {
  status: [],
  type: [],
  sortBy: 'due_date',
}

const DEFAULT_CUSTOMER_DOCUMENTS: CustomerDocumentsFilters = {
  initiativeStatus: [],
  documentStatus: [],
  nameSearch: '',
}

// --- Store ---

interface FilterState {
  actionItemsBoard: ActionItemsBoardFilters
  portfolio: PortfolioFilters
  content: ContentFilters
  skills: SkillsFilters
  customerActionItems: Record<string, CustomerActionItemsFilters>
  customerDocuments: Record<string, CustomerDocumentsFilters>

  setActionItemsBoardFilters: (filters: Partial<ActionItemsBoardFilters>) => void
  setPortfolioFilters: (filters: Partial<PortfolioFilters>) => void
  setContentFilters: (filters: Partial<ContentFilters>) => void
  setSkillsFilters: (filters: Partial<SkillsFilters>) => void
  setCustomerActionItemsFilters: (customerId: string, filters: Partial<CustomerActionItemsFilters>) => void
  setCustomerDocumentsFilters: (customerId: string, filters: Partial<CustomerDocumentsFilters>) => void
  getCustomerActionItemsFilters: (customerId: string) => CustomerActionItemsFilters
  getCustomerDocumentsFilters: (customerId: string) => CustomerDocumentsFilters
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      actionItemsBoard: { types: [], searchQuery: '' },
      portfolio: { typeFilter: 'all', statusFilter: 'all', searchQuery: '' },
      content: { typeFilter: 'all', statusFilter: 'all' },
      skills: { categoryFilter: 'all' },
      customerActionItems: {},
      customerDocuments: {},

      setActionItemsBoardFilters: (filters) =>
        set((state) => ({ actionItemsBoard: { ...state.actionItemsBoard, ...filters } })),

      setPortfolioFilters: (filters) =>
        set((state) => ({ portfolio: { ...state.portfolio, ...filters } })),

      setContentFilters: (filters) =>
        set((state) => ({ content: { ...state.content, ...filters } })),

      setSkillsFilters: (filters) =>
        set((state) => ({ skills: { ...state.skills, ...filters } })),

      setCustomerActionItemsFilters: (customerId, filters) =>
        set((state) => ({
          customerActionItems: {
            ...state.customerActionItems,
            [customerId]: { ...get().getCustomerActionItemsFilters(customerId), ...filters },
          },
        })),

      setCustomerDocumentsFilters: (customerId, filters) =>
        set((state) => ({
          customerDocuments: {
            ...state.customerDocuments,
            [customerId]: { ...get().getCustomerDocumentsFilters(customerId), ...filters },
          },
        })),

      getCustomerActionItemsFilters: (customerId) =>
        get().customerActionItems[customerId] ?? { ...DEFAULT_CUSTOMER_ACTION_ITEMS },

      getCustomerDocumentsFilters: (customerId) =>
        get().customerDocuments[customerId] ?? { ...DEFAULT_CUSTOMER_DOCUMENTS },
    }),
    {
      name: 'filter-storage',
      version: 1,
      partialize: (state) => ({
        actionItemsBoard: state.actionItemsBoard,
        portfolio: state.portfolio,
        content: state.content,
        skills: state.skills,
        customerActionItems: state.customerActionItems,
        customerDocuments: state.customerDocuments,
      }),
      migrate: () => {
        // v0→v1: `type?: string` renamed to `types: string[]`
        // Discard stale localStorage and return fresh defaults
        return {
          actionItemsBoard: { types: [], searchQuery: '' },
          portfolio: { typeFilter: 'all', statusFilter: 'all', searchQuery: '' },
          content: { typeFilter: 'all', statusFilter: 'all' },
          skills: { categoryFilter: 'all' },
          customerActionItems: {},
          customerDocuments: {},
        } as unknown as FilterState
      },
    }
  )
)
