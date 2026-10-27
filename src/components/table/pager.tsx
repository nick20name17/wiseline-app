import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId } from 'react'

const PAGE_SIZES = [20, 40, 100] as const

type PagerProps = {
  /** Zero-based. */
  page: number
  pageSize: number
  total: number
  noun: string
  onPage: (page: number) => void
  onPageSize: (size: number) => void
}

/** «1–40 of 781», rows per page, and back / forward under a client-side paged table. */
export const Pager = ({ page, pageSize, total, noun, onPage, onPageSize }: PagerProps) => {
  const sizeId = useId()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = total ? page * pageSize + 1 : 0
  const last = Math.min(total, (page + 1) * pageSize)

  return (
    <div className='flex flex-wrap items-center justify-end gap-3 text-sm text-muted-foreground'>
      <span className='flex items-center gap-2'>
        <label htmlFor={sizeId}>Rows per page</label>
        <Select value={String(pageSize)} onValueChange={value => onPageSize(Number(value))}>
          <SelectTrigger id={sizeId} size='sm' className='w-20'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map(size => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </span>
      <span className='font-mono'>
        {first}–{last} of {total} {noun}
      </span>
      <span className='flex gap-1'>
        <Button
          variant='outline'
          size='icon-sm'
          aria-label='Previous page'
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant='outline'
          size='icon-sm'
          aria-label='Next page'
          disabled={page >= pages - 1}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight />
        </Button>
      </span>
    </div>
  )
}
