import { RiRulerLine, RiWeightLine } from '@remixicon/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import * as z from 'zod/mini'

import { getLoadsQueryOptions } from '@/api/loads/query'
import type { Load } from '@/api/loads/schema'
import { DEFAULT_DATE_VALUE } from '@/components/common/filters/date'
import { DEFAULT_LIMIT } from '@/components/common/filters/pagination'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useSearchParams } from '@/hooks/use-search-params'
import { cn } from '@/lib/utils'
import { formatLength, formatWeight, ordinal } from '@/utils/format'

export const useLoadSelection = ({ readyToLoad = false }: { readyToLoad?: boolean } = {}) => {
  const [{ date = DEFAULT_DATE_VALUE, truck, load = '' }, setSearchParams] = useSearchParams()

  const { data: loads, isLoading } = useQuery({
    ...getLoadsQueryOptions({
      load_date: date,
      limit: DEFAULT_LIMIT,
      ready_to_load: readyToLoad ? readyToLoad : undefined,
      truck_id: truck ? +truck : undefined
    }),
    enabled: !!truck
  })

  const loadList = useMemo(() => loads?.results ?? [], [loads])

  useEffect(() => {
    if (!isLoading && loadList.length > 0 && !load) {
      setSearchParams({ load: loadList[0].id.toString() })
    }
  }, [isLoading, loads, load, setSearchParams, loadList])

  const handleChange = (value: string) => {
    if (!value) return
    setSearchParams({ load: value })
  }

  return {
    load,
    loads: loadList,
    isLoading,
    handleChange,
    count: loads?.count ?? 0
  }
}

export const LoadParamSchema = z.catch(z.optional(z.string()), undefined)

export const LoadFilter = () => {
  const { load, loads, isLoading, handleChange, count } = useLoadSelection()

  if (isLoading) return <LoadFilterSkeleton />
  if (count === 0) return <div className='flex h-11.5 items-center text-sm'>No loads</div>

  return (
    <ScrollArea className='w-full max-w-148'>
      <ToggleGroup
        type='single'
        value={load}
        onValueChange={handleChange}
        className='flex h-11.5 items-center gap-2.5'
      >
        {loads.map((l, index) => (
          <ToggleGroupItem
            key={l.id}
            value={l.id?.toString()}
            asChild
          >
            <LoadTab
              load={l}
              index={index}
              isActive={l.id?.toString() === load}
              onSelect={() => handleChange(l.id?.toString())}
            />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  )
}

const LoadTab = ({
  load,
  isActive,
  onSelect,
  index
}: {
  load: Load
  isActive: boolean
  onSelect: (value: string) => void
  index: number
}) => {
  return (
    <button
      onClick={() => onSelect(load.id?.toString())}
      className={cn(
        'rounded-md transition-colors',
        isActive
          ? 'flex h-full w-85 items-center gap-2.5 rounded-xl border border-[#85B2FE] p-1'
          : 'bg-muted flex size-11.5 flex-col items-center justify-center gap-0.5',
        !isActive && load.ready_to_load ? 'bg-[#E4F6EC]' : '',
        load.ready_to_load ? 'border-primary' : ''
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-0.5 rounded-md',
          isActive ? 'size-9.5 bg-[#E2ECFE]' : 'text-[10px] leading-none font-medium',
          isActive && load.ready_to_load ? 'bg-[#E4F6EC]' : ''
        )}
      >
        <div
          className={cn(
            'text-[10px] leading-none font-medium transition-colors',
            isActive ? 'text-[#5173AD]' : 'text-muted-foreground',
            load.ready_to_load ? 'text-primary' : ''
          )}
        >
          Load
        </div>
        <div
          className={cn(
            'text-sm leading-none font-semibold',
            load.ready_to_load ? 'text-[#14522F]' : ''
          )}
        >
          {ordinal(index + 1)}
        </div>
      </div>

      {isActive && (
        <div className='grid shrink-0 grid-cols-2 justify-between gap-x-2 gap-y-0.5 **:leading-none'>
          <DetailRow
            icon={<RiWeightLine className='size-3 text-[#CBCFD8]' />}
            label='Wt. limit:'
            value={formatWeight(load.truck.max_weight)}
          />
          <DetailRow
            icon={<RiWeightLine className='size-3 text-[#CBCFD8]' />}
            label='Load Wt.:'
            value={formatWeight(load.weight ?? 0)}
          />
          <DetailRow
            icon={<RiRulerLine className='size-3 text-[#CBCFD8]' />}
            label='Len. limit:'
            value={formatLength(load.truck.max_length, true)}
          />
          <DetailRow
            icon={<RiRulerLine className='size-3 text-[#CBCFD8]' />}
            label='Longest Len.:'
            value={formatLength(load.length ?? 0, true)}
          />
        </div>
      )}
    </button>
  )
}

const DetailRow = ({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) => (
  <div className='flex shrink-0 items-center justify-between gap-1.5'>
    <div className='flex items-center gap-0.5'>
      {icon}
      <span className='text-muted-foreground text-[10px]'>{label}</span>
    </div>
    <div className='text-xs'>{value}</div>
  </div>
)

const LoadFilterSkeleton = () => (
  <div className='flex items-center gap-2.5'>
    <Skeleton className='h-11.5 w-85 rounded-md' />
    {Array.from({ length: 3 }).map((_, index) => (
      <Skeleton
        className='size-11.5 rounded-md'
        key={index}
      />
    ))}
  </div>
)
