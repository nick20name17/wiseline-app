import { TableHead } from '@/components/ui/table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { Sort } from '@/lib/sort-rows'
import type { ReactNode } from 'react'

type SortHeadProps<K extends string> = {
  column: K
  sort: Sort<K>
  onSort: (sort: Sort<K>) => void
  children: ReactNode
}

/** A heading that sorts the table by its column, as EBMS does: a second click turns the order round. */
export const SortHead = <K extends string>({
  column,
  sort,
  onSort,
  children
}: SortHeadProps<K>) => {
  const active = sort.key === column
  const Icon = active ? (sort.desc ? ArrowDown : ArrowUp) : ArrowUpDown
  return (
    <TableHead aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : undefined}>
      <button
        type='button'
        className='-mx-1 inline-flex items-center gap-1 rounded-sm px-1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none'
        onClick={() => onSort({ key: column, desc: active && !sort.desc })}
      >
        {children}
        <Icon className={active ? 'size-3' : 'size-3 opacity-40'} />
      </button>
    </TableHead>
  )
}
