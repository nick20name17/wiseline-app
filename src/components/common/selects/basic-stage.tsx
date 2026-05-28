import { useQuery } from '@tanstack/react-query'

import { DEFAULT_LIMIT } from '../filters/pagination'

import type { BasicSelectProps } from './types'
import { getStagesQueryOptions } from '@/api/stages/query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type BasicStageSelectProps = BasicSelectProps<string>

export const BasicStageSelect = ({
  className,
  disabled,
  value,
  onChange
}: BasicStageSelectProps) => {
  const { data: stages, isLoading } = useQuery(getStagesQueryOptions({ limit: DEFAULT_LIMIT }))

  if (isLoading) {
    return <Skeleton className='h-9 w-full' />
  }

  return (
    <Select
      disabled={isLoading || disabled}
      value={value}
      onValueChange={onChange}
    >
      <SelectTrigger className={cn('focus-visible:ring-0', className)}>
        <div className='truncate'>
          <SelectValue placeholder='Stage' />
        </div>
      </SelectTrigger>
      <SelectContent>
        {stages?.results?.map((stage) => (
          <SelectItem
            key={stage.id}
            value={stage.id.toString()}
          >
            {stage.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
