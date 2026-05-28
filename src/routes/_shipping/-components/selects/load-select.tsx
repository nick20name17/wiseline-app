import { RiArrowDownSLine } from '@remixicon/react'
import { useQuery } from '@tanstack/react-query'

import { getLoadsQueryOptions, useCreateLoad } from '@/api/loads/query'
import { DEFAULT_LIMIT } from '@/components/common/filters/pagination'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatLength, formatWeight, ordinal } from '@/utils/format'

interface LoadSelectProps {
  className?: string
  onChange: (value: string) => void
  value: string
  filters?: {
    roadConfirmed?: boolean
    releaseToLoading?: boolean
  }
  truckId: string
  date: string | undefined
  withoutCreate?: boolean
}

export const LoadSelect = ({
  className,
  onChange,
  value,
  truckId,
  date,
  filters,
  withoutCreate = false
}: LoadSelectProps) => {
  const { data: loads, isLoading } = useQuery({
    ...getLoadsQueryOptions({
      limit: DEFAULT_LIMIT,
      truck_id: +truckId,
      load_date: date,
      ...(filters?.roadConfirmed !== undefined && { road_confirmed: filters.roadConfirmed }),
      ...(filters?.releaseToLoading !== undefined && { ready_to_load: filters.releaseToLoading })
    }),
    enabled: !!truckId && !!date
  })

  const { handleCreateLoad, isPending } = useCreateLoad()

  if (isLoading) {
    return <Skeleton className={cn('h-9 w-full', className)} />
  }

  const selectedLoad = loads?.results?.find((t) => t.id.toString() === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className={cn('justify-between', className)}
          disabled={isLoading || !truckId || !date}
        >
          <span>
            {selectedLoad ? `Load ${ordinal(selectedLoad?.position ?? 0)}` : 'Choose load'}
          </span>
          <RiArrowDownSLine className='opacity-50' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        side='top'
        className='w-56 p-2'
      >
        {withoutCreate ? null : (
          <div className='flex cursor-pointer flex-col items-start gap-1.5'>
            <Button
              onClick={() =>
                handleCreateLoad({
                  load_date: date!,
                  truck_id: +truckId,
                  position: (loads?.results?.length ?? 0) + 1,
                  status: null
                })
              }
              isLoading={isPending}
              disabled={isPending}
              className='w-full'
              variant='secondary'
              size='sm'
            >
              Create Load
            </Button>
          </div>
        )}
        <ScrollArea>
          <div className={cn('flex h-full max-h-64 flex-col gap-1', withoutCreate ? '' : 'mt-2')}>
            {loads?.count === 0 ? (
              <DropdownMenuItem disabled>No loads found</DropdownMenuItem>
            ) : (
              loads?.results?.map((load, idx) => (
                <DropdownMenuItem
                  key={`${load.id}-${idx}`}
                  onClick={() => onChange(load.id.toString())}
                  className={cn(
                    'flex cursor-pointer flex-col items-start gap-1.5',
                    selectedLoad?.id === load.id && 'bg-muted'
                  )}
                >
                  <span className='leading-none font-medium'>
                    <span>Load </span>
                    {ordinal(idx + 1)}
                  </span>
                  <div className='text-muted-foreground w-full space-y-1 text-xs leading-none'>
                    <div className='flex justify-between gap-4'>
                      <span>Weight limit:</span>
                      <span>{formatWeight(load.truck.max_weight)}</span>
                    </div>
                    <div className='flex justify-between gap-4'>
                      <span>Load wt:</span>
                      <span>{formatWeight(load.weight ?? 0)}</span>
                    </div>
                    <div className='flex justify-between gap-4'>
                      <span>Length limit:</span>
                      <span>{formatLength(load.truck.max_length, true)}</span>
                    </div>

                    <div className='flex justify-between gap-4'>
                      <span>Longest Len.:</span>
                      <span>{formatLength(load.length ?? 0, true)}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
