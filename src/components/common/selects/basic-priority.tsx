import { useQuery } from '@tanstack/react-query'

import { PriorityBadge } from '../badges/priority'

import { getPrioritiesQueryOptions } from '@/api/priorities/query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface PrioritySelectProps {
  className?: string
  onChange: (value: string) => void
  priority: string | undefined
  disabled?: boolean
  readonly?: boolean
}

export const BasicPrioritySelect = ({
  className,
  disabled,
  priority,
  onChange,
  readonly
}: PrioritySelectProps) => {
  const { data: priorities, isLoading } = useQuery(getPrioritiesQueryOptions())

  if (isLoading) {
    return (
      <div className='h-full py-1'>
        <Skeleton className='h-full w-full' />
      </div>
    )
  }

  if (readonly) {
    const selectedPriority = priority ? priorities?.find((p) => p.id === parseInt(priority)) : null
    return selectedPriority ? <PriorityBadge priority={selectedPriority} /> : '—'
  }

  return (
    <Select
      disabled={isLoading || disabled}
      value={priority}
      onValueChange={onChange}
    >
      <SelectTrigger
        size='sm'
        className={cn('focus-visible:ring-0', className)}
      >
        <SelectValue placeholder='Priority' />
      </SelectTrigger>
      <SelectContent>
        {priorities?.map((priority) => (
          <SelectItem
            key={priority.id}
            value={priority.id.toString()}
          >
            <PriorityBadge priority={priority} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
