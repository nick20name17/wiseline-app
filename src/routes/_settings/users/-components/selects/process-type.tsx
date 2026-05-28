import { PROCESS_TYPES, type ProcessType } from '@/api/users/schema'
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue
} from '@/components/ui/multi-select'

interface ProcessTypeSelectProps {
  className?: string
  onChange: (value: ProcessType[]) => void
  value: ProcessType[]
}

export const ProcessTypeSelect = ({ className, onChange, value }: ProcessTypeSelectProps) => {
  return (
    <MultiSelect
      values={value}
      onValuesChange={(value) => onChange(value as ProcessType[])}
    >
      <MultiSelectTrigger className={className}>
        <MultiSelectValue
          className='capitalize'
          overflowBehavior='cutoff'
          placeholder='Choose departments'
        />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectGroup>
          {PROCESS_TYPES.filter((p) => p !== 'driver').map((type) => (
            <MultiSelectItem
              className='capitalize'
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
