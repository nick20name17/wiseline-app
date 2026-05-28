'use no memo'

import { type Table, flexRender } from '@tanstack/react-table'

import { pinnedClasses } from './constants'
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface DataTableHeaderProps<TData> {
  table: Table<TData>
  isStickyHeader?: boolean
}

export const DataTableHeader = <TData,>({ table, isStickyHeader }: DataTableHeaderProps<TData>) => {
  return (
    <TableHeader className={cn('bg-muted', isStickyHeader && 'sticky top-0 z-10')}>
      {table?.getHeaderGroups()?.map((headerGroup) => (
        <TableRow
          className='border-none'
          key={headerGroup?.id}
        >
          {headerGroup.headers.map((header) => {
            const size = header.getSize() ? `${header.getSize()}px` : 'auto'
            const pinned = header.column.getIsPinned()

            return (
              <TableHead
                style={{
                  width: size,
                  minWidth: size,
                  maxWidth: size
                }}
                className={cn(
                  'shadow-[inset_0_-1px_0] shadow-gray-300',
                  pinned && pinnedClasses[pinned]
                )}
                key={header.id}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            )
          })}
        </TableRow>
      ))}
    </TableHeader>
  )
}
