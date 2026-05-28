import { useQuery } from '@tanstack/react-query'

import { getWarehousesQueryOptions } from '@/api/warehouses/query'
import { DEFAULT_LIMIT } from '@/components/common/filters/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

interface WarehousesSelectProps {
  className?: string
  onChange: (value: number | undefined) => void
  value: number | undefined
}

export const WarehousesSelect = ({ className, onChange, value }: WarehousesSelectProps) => {
  const { data: warehouses, isLoading } = useQuery(
    getWarehousesQueryOptions({ limit: DEFAULT_LIMIT })
  )

  return (
    <Select
      disabled={isLoading}
      value={value?.toString()}
      onValueChange={(value) => onChange(parseInt(value))}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder='Warehouse' />
      </SelectTrigger>
      <SelectContent>
        {warehouses?.results?.map((warehouse) => (
          <SelectItem
            key={warehouse.id}
            value={warehouse.id.toString()}
          >
            {warehouse.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
