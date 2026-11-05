import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { lastPage } from '@/lib/use-page'
import type { RefObject } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

type TablePaginationProps = {
  /** Zero-based. */
  page: number
  pageSize: number
  count: number
  onPageChange: (page: number) => void
  /** The next page is on its way: the old one stays up until it lands. */
  pending?: boolean
  /** The table's box, taken back to its first row on a page turn. */
  table: RefObject<HTMLElement | null>
}

const number = new Intl.NumberFormat('en-US')

/** The pages of a long server list, as tablecn's grid pages them. Absent while it all fits on one. */
export const TablePagination = ({
  page,
  pageSize,
  count,
  onPageChange,
  pending,
  table
}: TablePaginationProps) => {
  const last = lastPage(count, pageSize)
  if (!last) return null

  // A table scrolls in its own box on a wide screen and with the page on a phone: both go back up.
  const turn = (next: number) => {
    onPageChange(next)
    table.current?.querySelector('[data-slot=table-container]')?.scrollTo({ top: 0 })
    if ((table.current?.getBoundingClientRect().top ?? 0) < 0)
      table.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <nav aria-label='Pages' className='flex items-center justify-end gap-4 text-sm'>
      {pending ? <Spinner /> : null}
      <span className='text-muted-foreground tabular-nums'>
        {number.format(page * pageSize + 1)}–{number.format(Math.min(count, (page + 1) * pageSize))}{' '}
        of {number.format(count)}
      </span>
      <span className='font-medium tabular-nums max-sm:hidden'>
        Page {page + 1} of {last + 1}
      </span>
      <div className='flex items-center gap-1.5'>
        <Button
          variant='outline'
          size='icon-sm'
          aria-label='First page'
          className='max-sm:hidden'
          disabled={!page}
          onClick={() => turn(0)}
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant='outline'
          size='icon-sm'
          aria-label='Previous page'
          disabled={!page}
          onClick={() => turn(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant='outline'
          size='icon-sm'
          aria-label='Next page'
          disabled={page >= last}
          onClick={() => turn(page + 1)}
        >
          <ChevronRight />
        </Button>
        <Button
          variant='outline'
          size='icon-sm'
          aria-label='Last page'
          className='max-sm:hidden'
          disabled={page >= last}
          onClick={() => turn(last)}
        >
          <ChevronsRight />
        </Button>
      </div>
    </nav>
  )
}
