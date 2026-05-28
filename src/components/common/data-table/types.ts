import type { Row, Table } from '@tanstack/react-table'
import type { ReactElement } from 'react'

import type { ColumnKey } from './constants'

export interface DataTableProps<TData> {
  data: TData[]
  isLoading?: boolean
  className?: string
  columnVisibility?: Partial<Record<ColumnKey, boolean>>
  onRowClick?: (row: Row<TData>) => void
  readonlyColumns?: ColumnKey[]
}

export interface InternalDataTableProps<TData> {
  table: Table<TData>
  isLoading?: boolean
  className?: string
  isStickyHeader?: boolean
  renderSubComponent?: (row: Row<TData>) => ReactElement
  onRowClick?: (row: Row<TData>) => void
}
