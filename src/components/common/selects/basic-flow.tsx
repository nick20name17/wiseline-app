import { useQuery } from '@tanstack/react-query'

import { DEFAULT_LIMIT } from '../filters/pagination'

import type { BasicSelectProps } from './types'
import { getFlowsQueryOptions } from '@/api/flows/query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { capitalize } from '@/utils/format'

type BasicFlowSelectProps = BasicSelectProps<string> & {
  category?: string
}

export const BasicFlowSelect = ({
  className,
  disabled,
  value,
  onChange,
  category
}: BasicFlowSelectProps) => {
  const { data: flows, isLoading } = useQuery({
    ...getFlowsQueryOptions({ category__prod_type: capitalize(category), limit: DEFAULT_LIMIT }),
    enabled: category !== 'Accessories'
  })

  if (isLoading) {
    return (
      <div className='h-full py-1'>
        <Skeleton className='h-full w-full' />
      </div>
    )
  }

  if (category === 'Accessories') {
    return '—'
  }

  return (
    <Select
      disabled={isLoading || disabled || flows?.count === 0}
      value={value}
      onValueChange={onChange}
    >
      <SelectTrigger
        size='sm'
        className={cn('focus-visible:ring-0', className)}
      >
        <div className='truncate'>
          <SelectValue placeholder='Choose machine' />
        </div>
      </SelectTrigger>
      <SelectContent>
        {flows?.results?.map((flow) => (
          <SelectItem
            key={flow.id}
            value={flow.id.toString()}
          >
            {flow.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
