export type {
  ActionItem,
  ActionItemWithCustomer,
  ActionItemType,
  ActionItemStatus,
  CreateActionItemInput,
  UpdateActionItemInput,
} from '@/features/customers/types/customer'

export {
  ACTION_ITEM_TYPES,
  ACTION_ITEM_TYPE_LABELS,
  ACTION_ITEM_TYPE_COLORS,
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_STATUS_LABELS,
  ACTION_ITEM_STATUS_COLORS,
} from '@/features/customers/types/customer'

export interface BoardFilters {
  customer_id?: string
  status?: string[]
}
