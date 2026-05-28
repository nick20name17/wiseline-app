import * as z from 'zod/mini'

import {
  Pagination,
  PaginationContent,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useSearchParams } from '@/hooks/use-search-params'
import { cn } from '@/lib/utils'

export const LIMIT_OPTIONS = [20, 40, 60, 80, 100] as const
export const DEFAULT_LIMIT = LIMIT_OPTIONS[1]
const MAX_LIMIT = LIMIT_OPTIONS[LIMIT_OPTIONS.length - 1]

export const LimitParamSchema = z.catch(
  z.optional(z.number().check(z.minimum(DEFAULT_LIMIT), z.maximum(MAX_LIMIT))),
  DEFAULT_LIMIT
)
export const OffsetParamSchema = z.catch(z.optional(z.number().check(z.minimum(0))), 0)

interface PaginationControlsProps {
  count: number
  className?: string
}

export const PaginationControls = ({ count, className }: PaginationControlsProps) => {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <OffsetControls count={count} />
      <LimitControls />
    </div>
  )
}

export const OffsetControls = ({ count, className }: PaginationControlsProps) => {
  const [{ offset = 0, limit = DEFAULT_LIMIT }, setSearchParams] = useSearchParams()

  const totalPages = Math.max(1, Math.ceil(count / limit))
  const currentPage = Math.min(totalPages, Math.floor(offset / limit) + 1)

  const setOffset = (offset: number) => {
    setSearchParams({ offset })
  }

  const handlePrevious = () => setOffset(Math.max(0, offset - limit))

  const handleNext = () => setOffset(Math.min((totalPages - 1) * limit, offset + limit))

  const handleFirst = () => setOffset(0)

  const handleLast = () => setOffset((totalPages - 1) * limit)

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationFirst
            onClick={handleFirst}
            className={cn('border', {
              'pointer-events-none opacity-50': currentPage === 1
            })}
          />
        </PaginationItem>

        <PaginationItem>
          <PaginationPrevious
            onClick={handlePrevious}
            className={cn('border', {
              'pointer-events-none opacity-50': currentPage === 1
            })}
          />
        </PaginationItem>

        <div className='px-2'>
          Page {currentPage} of {totalPages}
        </div>

        <PaginationItem>
          <PaginationNext
            onClick={handleNext}
            className={cn('border', {
              'pointer-events-none opacity-50': currentPage === totalPages
            })}
          />
        </PaginationItem>

        <PaginationItem>
          <PaginationLast
            onClick={handleLast}
            className={cn('border', {
              'pointer-events-none opacity-50': currentPage === totalPages
            })}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

interface LimitControlsProps {
  className?: string
}

export const LimitControls = ({ className }: LimitControlsProps) => {
  const [{ limit = DEFAULT_LIMIT }, setSearchParams] = useSearchParams()

  const setLimit = (limit: number) => {
    setSearchParams({ limit, offset: 0 })
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span>Rows per page</span>
      <Select
        value={limit?.toString()}
        onValueChange={(value) => setLimit(parseInt(value))}
      >
        <SelectTrigger>
          <SelectValue placeholder='Limit' />
        </SelectTrigger>
        <SelectContent>
          {LIMIT_OPTIONS.map((limitOption) => (
            <SelectItem
              key={limitOption}
              value={limitOption?.toString()}
            >
              {limitOption}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
