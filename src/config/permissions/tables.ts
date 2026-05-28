import type { UserRoles } from '@/api/users/schema'
import type { ColumnKey } from '@/components/common/data-table/constants'

type ColumnConfig = {
  hidden?: ColumnKey[]
  readonly?: ColumnKey[]
}

const ROLE_COLUMN_CONFIG: Record<UserRoles, ColumnConfig> = {
  admin: {},

  super_manager: {
    hidden: []
  },

  manager: {
    hidden: ['origin_item_actions']
  },

  worker: {
    hidden: ['release_to_production', 'review', 'completed_date'],
    readonly: ['production_date', 'flow', 'pfs']
  },

  driver: {},

  client: {
    readonly: ['priority', 'release_to_production', 'review', 'production_date']
  }
}

export const getVisibleColumns = (role: UserRoles, allColumns: ColumnKey[]): ColumnKey[] => {
  const hidden = new Set(ROLE_COLUMN_CONFIG[role].hidden ?? [])
  return allColumns.filter((col) => !hidden.has(col))
}

export const isColumnHidden = (role: UserRoles, column: ColumnKey): boolean => {
  return ROLE_COLUMN_CONFIG[role].hidden?.includes(column) ?? false
}

export const isColumnReadonly = (role: UserRoles, column: ColumnKey): boolean => {
  return ROLE_COLUMN_CONFIG[role].readonly?.includes(column) ?? false
}

export const getColumnVisibilityState = (
  role: UserRoles,
  allColumns: ColumnKey[]
): Record<ColumnKey, boolean> => {
  const hidden = new Set(ROLE_COLUMN_CONFIG[role].hidden ?? [])
  return Object.fromEntries(allColumns.map((col) => [col, !hidden.has(col)])) as Record<
    ColumnKey,
    boolean
  >
}
