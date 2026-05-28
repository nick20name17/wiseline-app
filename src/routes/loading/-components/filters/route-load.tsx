import { RiDirectionLine, RiRulerLine, RiWeightLine } from '@remixicon/react'
import clsx from 'clsx'

import type { Load } from '@/api/loads/schema'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { useLoadSelection } from '@/routes/_shipping/-components/filters/load'
import { CreateRouteDialog } from '@/routes/_shipping/shipping/-components/dialogs/create-route'
import { formatLength, formatWeight, ordinal } from '@/utils/format'

export const RouteLoadFilter = () => {
  const { load, loads, isLoading, handleChange, count } = useLoadSelection({ readyToLoad: true })

  if (isLoading) return <RouteLoadSkeleton />
  if (count === 0) return <div className='flex h-11.5 items-center text-sm'>No loads</div>

  return (
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
            isActive={load === l.id?.toString()}
            toggleActive={() => handleChange(l.id?.toString())}
          />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

interface LoadTabProps {
  load: Load
  isActive: boolean
  index: number
  toggleActive: (value: string) => void
}

const LoadTab = ({ load, toggleActive, isActive, index }: LoadTabProps) => {
  return (
    <button
      onClick={() => toggleActive(load.id?.toString())}
      className={clsx(
        'rounded-md transition-colors',
        isActive
          ? 'border-primary flex h-11.5 w-110 items-center gap-2.5 rounded-xl border p-1'
          : 'bg-muted flex size-11.5 flex-col items-center justify-center gap-0.5'
      )}
    >
      <div
        className={clsx(
          'flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-md p-1',
          isActive ? 'size-9.5 bg-[#E4F6EC]' : 'text-[10px] font-medium'
        )}
      >
        <div
          className={clsx(
            'text-[10px] leading-none font-medium transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          Load
        </div>
        <div
          className={cn('text-sm leading-none font-semibold', isActive ? 'text-[#14522F]' : null)}
        >
          {ordinal(index + 1)}
        </div>
      </div>

      {isActive && (
        <div className='flex flex-1 shrink-0 items-center justify-between gap-x-2'>
          <div className='grid grid-cols-2 gap-x-2 gap-y-0.5 **:leading-none'>
            <DetailRow
              icon={<RiWeightLine className='size-3 text-[#CBCFD8]' />}
              label='Wt. limit:'
              value={formatWeight(load.truck.max_weight)}
            />

            <DetailRow
              icon={<RiRulerLine className='size-3 text-[#CBCFD8]' />}
              label='Len. limit:'
              value={formatLength(load.truck.max_length, true)}
            />
            <DetailRow
              icon={<RiWeightLine className='size-3 text-[#CBCFD8]' />}
              label='Load Wt.:'
              value={formatWeight(load.weight ?? 0)}
            />
            <DetailRow
              icon={<RiRulerLine className='size-3 text-[#CBCFD8]' />}
              label='Longest Len.:'
              value={formatLength(load.length ?? 0, true)}
            />
          </div>

          <CreateRouteDialog
            loadId={load.id}
            readonly
          >
            <Button onClick={(e) => e.stopPropagation()}>
              <RiDirectionLine />
              <span>Route</span>
            </Button>
          </CreateRouteDialog>
        </div>
      )}
    </button>
  )
}

const RouteLoadSkeleton = () => (
  <div className='flex items-center gap-2.5'>
    <Skeleton className='h-11.5 w-110 rounded-md' />
    {Array.from({ length: 3 }).map((_, index) => (
      <Skeleton
        className='size-11.5 rounded-md'
        key={index}
      />
    ))}
  </div>
)

interface DetailRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

const DetailRow = ({ icon, label, value }: DetailRowProps) => (
  <div className='flex shrink-0 items-center justify-between gap-1.5'>
    <div className='flex items-center gap-0.5'>
      {icon}
      <span className='text-muted-foreground text-[10px]'>{label}</span>
    </div>
    <div className='text-xs'>{value}</div>
  </div>
)
