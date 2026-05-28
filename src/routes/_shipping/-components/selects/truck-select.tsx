import { RiArrowDownSLine } from '@remixicon/react'
import { useQuery } from '@tanstack/react-query'

import { getTrucksQueryOptions } from '@/api/trucks/query'
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
import { formatLength, formatWeight } from '@/utils/format'

interface TruckSelectProps {
  className?: string
  onChange: (value: string) => void
  value: string
}

export const TruckSelect = ({ className, onChange, value }: TruckSelectProps) => {
  const { data: trucks, isLoading } = useQuery(getTrucksQueryOptions({ limit: DEFAULT_LIMIT }))

  if (isLoading) {
    return <Skeleton className={cn('h-9 w-full', className)} />
  }

  const selectedTruck = trucks?.find((t) => t.id.toString() === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className={cn('justify-between', className)}
          disabled={isLoading}
        >
          <span> {selectedTruck?.name || 'Choose truck'}</span>
          <RiArrowDownSLine className='opacity-50' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        className='w-56 p-2'
      >
        <ScrollArea>
          <div className='h-full max-h-64 space-y-1'>
            {trucks?.map((truck, idx) => (
              <DropdownMenuItem
                key={`${truck.id}-${idx}`}
                onClick={() => onChange(truck.id.toString())}
                className={cn(
                  'flex cursor-pointer flex-col items-start gap-1.5 px-2 py-2.5',
                  selectedTruck?.id === truck.id && 'bg-muted'
                )}
              >
                <span className='leading-none font-medium'>{truck.name}</span>
                <div className='text-muted-foreground w-full space-y-1 text-xs leading-none'>
                  <div className='flex justify-between gap-4'>
                    <span>Weight limit:</span>
                    <span>{formatWeight(truck.max_weight)}</span>
                  </div>
                  <div className='flex justify-between gap-4'>
                    <span>Length limit:</span>
                    <span>{formatLength(truck.max_length)}</span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// const LoadInfo = () => {
//   return (
//     <div className='space-y-1 rounded-sm border p-2 text-sm leading-none'>
//       <div className='flex justify-between gap-4'>
//         <span>Load Weight:</span>
//         <span>{formatWeight(400)}</span>
//       </div>
//       <div className='flex justify-between gap-4'>
//         <span>Longest Length:</span>
//         <span>18&apos; 7.5&quot;</span>
//       </div>
//     </div>
//   )
// }
