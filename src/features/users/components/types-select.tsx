import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { typeLabel } from '../lib/roles'

type TypesSelectProps<T extends string> = {
  id: string
  options: readonly T[]
  value: T[]
  onChange: (types: T[]) => void
  placeholder: string
  invalid?: true
}

/** Multi-select over a fixed list; the trigger reads back the picks, in the order they appear. */
export const TypesSelect = <T extends string>({
  id,
  options,
  value,
  onChange,
  placeholder,
  invalid
}: TypesSelectProps<T>) => {
  const readBack = (types: T[]) => {
    const picked = new Set<string>(types)
    const labels = options.filter(option => picked.has(option)).map(typeLabel)
    return labels.length ? labels.join(', ') : null
  }

  return (
    <Select multiple value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className='w-full' aria-invalid={invalid}>
        <SelectValue placeholder={placeholder}>{readBack}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option} value={option}>
            {typeLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
