import { PRODUCTION_TYPES, type ProductCategory } from '@/api/users/schema'
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue
} from '@/components/ui/multi-select'

interface ProductionTypeSelectProps {
  className?: string
  onChange: (value: ProductCategory[]) => void
  value: ProductCategory[]
}

const DISABLED_TYPES: ProductCategory[] = ['Accessories', 'Flatstock']

export const ProductionTypeSelect = ({ className, onChange, value }: ProductionTypeSelectProps) => {
  return (
    <MultiSelect
      values={value}
      onValuesChange={(value) => onChange(value as ProductCategory[])}
    >
      <MultiSelectTrigger className={className}>
        <MultiSelectValue
          overflowBehavior='cutoff'
          placeholder='Choose production types'
        />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectGroup>
          {PRODUCTION_TYPES.filter((type) => !DISABLED_TYPES.includes(type)).map((type) => (
            <MultiSelectItem
              key={type}
              value={type}
            >
              {type}
            </MultiSelectItem>
          ))}
        </MultiSelectGroup>
      </MultiSelectContent>
    </MultiSelect>
  )
}
