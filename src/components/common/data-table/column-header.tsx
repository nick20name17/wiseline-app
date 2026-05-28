'use no memo'

import { RiArrowDownLine, RiArrowUpLine, RiExpandUpDownLine } from '@remixicon/react'
import type { Column } from '@tanstack/react-table'

interface DataColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
}

export const ColumnHeader = <TData, TValue>({
  column,
  title
}: DataColumnHeaderProps<TData, TValue>) => {
  if (!column.getCanSort()) {
    return <div>{title}</div>
  }

  return (
    <button
      onClick={column.getToggleSortingHandler()}
      className='text-grey-500 inline-flex size-full cursor-pointer items-center justify-between gap-1 whitespace-nowrap focus-visible:outline-0 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'
    >
      <span className='truncate'>{title}</span>
      {column.getIsSorted() === 'desc' ? (
        <RiArrowDownLine />
      ) : column.getIsSorted() === 'asc' ? (
        <RiArrowUpLine />
      ) : (
        <RiExpandUpDownLine />
      )}
    </button>
  )
}
