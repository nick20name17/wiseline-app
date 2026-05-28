import { useQuery } from '@tanstack/react-query'

import { getAllUsersQueryOptions } from '@/api/users/query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

interface TruckDriverSelectProps {
  className?: string
  onChange: (value: number | undefined) => void
  value: number | undefined
}

export const TruckDriverSelect = ({ className, onChange, value }: TruckDriverSelectProps) => {
  const { data: allUsers, isLoading } = useQuery({
    ...getAllUsersQueryOptions(),
    select: (data) => data.filter((user) => user.role === 'driver')
  })

  return (
    <Select
      disabled={isLoading}
      value={value?.toString()}
      onValueChange={(value) => onChange(parseInt(value))}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder='Driver' />
      </SelectTrigger>
      <SelectContent>
        {allUsers?.map((user) => (
          <SelectItem
            key={user.id}
            value={user.id.toString()}
          >
            {user?.first_name} {user?.last_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
