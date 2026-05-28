import { RiTruckLine } from '@remixicon/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import * as z from 'zod/mini'

import { getTrucksQueryOptions } from '@/api/trucks/query'
import { DEFAULT_LIMIT } from '@/components/common/filters/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useSearchParams } from '@/hooks/use-search-params'

export const TruckParamSchema = z.catch(z.optional(z.string()), undefined)

interface TruckFilterProps {
  enforceSelection?: boolean
}
interface TruckFilterProps {
  enforceSelection?: boolean
}

export const TruckFilter = ({ enforceSelection = true }: TruckFilterProps) => {
  const [{ truck }, setSearchParams] = useSearchParams()
  const { data: trucks, isLoading } = useQuery(getTrucksQueryOptions({ limit: DEFAULT_LIMIT }))

  useEffect(() => {
    if (enforceSelection && !isLoading && trucks?.length && !truck) {
      const firstTruck = trucks[0]

      setSearchParams({
        truck: firstTruck.id.toString(),
        load: undefined
      })
    }
  }, [enforceSelection, isLoading, trucks, truck, setSearchParams])

  const onTruckChange = (value: string) => {
    if (enforceSelection && !value) return

    if (value === truck) return

    setSearchParams({
      truck: value || undefined,
      load: undefined
    })
  }

  if (isLoading) {
    return (
      <div className='flex gap-2'>
        <Skeleton className='h-9 w-25' />
        <Skeleton className='h-9 w-25' />
        <Skeleton className='h-9 w-25' />
      </div>
    )
  }

  return (
    <ToggleGroup
      type='single'
      value={truck ?? ''}
      onValueChange={onTruckChange}
      disabled={isLoading}
    >
      {trucks?.map((t) => (
        <ToggleGroupItem
          key={t.id}
          value={t.id.toString()}
          className='w-25'
        >
          <RiTruckLine />
          <span>{t.name}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

// const TruckTooltip = ({ text }: { text: string }) => {
//   return (
//     <Tooltip>
//       <TooltipTrigger>
//         <RiInformationLine className='text-muted-foreground' />
//       </TooltipTrigger>
//       <TooltipContent>
//         <p>{text}</p>
//       </TooltipContent>
//     </Tooltip>
//   )
// }
