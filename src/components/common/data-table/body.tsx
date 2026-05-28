'use no memo'

import { type Cell, type Row, flexRender } from '@tanstack/react-table'
import { Fragment } from 'react/jsx-runtime'

import { pinnedClasses } from './constants'
import { DataTableSkeleton } from './skeleton'
import type { InternalDataTableProps } from './types'
import { TableBody, TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const TableBodyCell = <TData,>({ cell }: { cell: Cell<TData, unknown> }) => {
  const pinned = cell.column.getIsPinned()
  const size = cell.column.getSize()

  return (
    <TableCell
      key={cell.id}
      style={{ width: size, minWidth: size, maxWidth: size }}
      className={cn(
        'has-[#checkbox]:bg-muted has-[#expander]:bg-muted border-b',
        pinned && pinnedClasses[pinned]
      )}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  )
}

const TableBodyRow = <TData,>({
  row,
  onRowClick
}: {
  row: Row<TData>
  onRowClick?: (row: Row<TData>) => void
}) => {
  return (
    <TableRow
      key={row.id}
      id={`row-${row.id}`}
      className={cn('last:[&>td]:border-b-0', onRowClick ? 'hover:bg-muted cursor-pointer' : '')}
      data-state={row.getIsSelected() && 'selected'}
      onClick={() => onRowClick?.(row)}
    >
      {row.getVisibleCells().map((cell) => (
        <TableBodyCell
          key={cell.id}
          cell={cell}
        />
      ))}
    </TableRow>
  )
}

const TableBodyExpandedRow = <TData,>({
  row,
  renderSubComponent
}: {
  row: Row<TData>
  renderSubComponent: (row: Row<TData>) => React.ReactElement
}) => (
  <tr className='expanded-row'>
    <TableCell
      colSpan={row.getVisibleCells().length}
      className='border-b p-0'
    >
      <div
        className='relative overflow-hidden py-2.5 pr-2.5 pl-10.5'
        data-slot='expanded-row-content'
      >
        {renderSubComponent(row)}
      </div>
    </TableCell>
  </tr>
)

export const DataTableBody = <TData,>({
  table,
  isLoading = false,
  renderSubComponent,
  onRowClick
}: InternalDataTableProps<TData>) => {
  if (isLoading) {
    return <DataTableSkeleton headers={table.getHeaderGroups()[0].headers} />
  }

  const columntsLength = table.getAllColumns().length

  if (!table.getRowModel().rows?.length) {
    return (
      <TableRow>
        <TableCell
          colSpan={columntsLength}
          className='h-24 text-center'
        >
          No results.
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => {
        return (
          <Fragment key={row.id}>
            <TableBodyRow
              row={row}
              onRowClick={onRowClick}
            />
            {row.getIsExpanded() && renderSubComponent ? (
              <TableBodyExpandedRow
                row={row}
                renderSubComponent={renderSubComponent}
              />
            ) : null}
          </Fragment>
        )
      })}
    </TableBody>
  )
}
