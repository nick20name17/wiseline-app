'use no memo'

import type { RowData } from '@tanstack/react-table'

import { DataTableBody } from './body'
import type { ColumnKey } from './constants'
import { DataTableHeader } from './header'
import type { InternalDataTableProps } from './types'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Table } from '@/components/ui/table'
import { cn } from '@/lib/utils'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    isColumnReadonly?: (columnKey: ColumnKey) => boolean
  }
}

export const DataTable = <TData,>({
  className,
  table,
  isLoading,
  onRowClick,
  renderSubComponent,
  isStickyHeader = true
}: InternalDataTableProps<TData>) => {
  return (
    <ScrollArea
      className={cn('outline-border h-full min-h-0 rounded-md outline', className)}
      type='always'
    >
      <Table>
        <DataTableHeader
          table={table}
          isStickyHeader={isStickyHeader}
        />
        <DataTableBody
          table={table}
          isLoading={isLoading}
          onRowClick={onRowClick}
          renderSubComponent={renderSubComponent}
        />
      </Table>
      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  )
}
