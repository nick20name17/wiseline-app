import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { driversQuery } from '../api'

type DriverSelectProps = {
  id?: string
  value: number | null
  onChange: (value: number | null) => void
  invalid?: boolean
}

export const DriverSelect = ({ id, value, onChange, invalid }: DriverSelectProps) => {
  const { data: drivers, isPending } = useQuery(driversQuery)

  const items = (drivers ?? []).map(driver => ({
    value: driver.id,
    label: `${driver.first_name} ${driver.last_name}`.trim() || `User ${driver.id}`
  }))

  return (
    <Select
      items={items}
      value={value}
      onValueChange={onChange}
      disabled={isPending}
      name='driver_id'
    >
      <SelectTrigger id={id} className='w-full' aria-invalid={invalid}>
        <SelectValue placeholder='Driver' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
