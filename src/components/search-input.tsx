import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/components/ui/input-group'
import { Search, X } from 'lucide-react'
import { useRef } from 'react'

type SearchInputProps = {
  value: string
  label: string
  placeholder?: string
  className?: string
  onValueChange: (value: string) => void
}

/**
 * Every search box in the app. The clear button is its own, not the browser's: each browser draws
 * that one differently, and Safari and Firefox not at all.
 */
export const SearchInput = ({
  value,
  label,
  placeholder = 'Search...',
  className,
  onValueChange
}: SearchInputProps) => {
  const input = useRef<HTMLInputElement>(null)
  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        ref={input}
        type='search'
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={event => onValueChange(event.target.value)}
      />
      {value ? (
        <InputGroupAddon align='inline-end'>
          <InputGroupButton
            size='icon-xs'
            aria-label='Clear search'
            onClick={() => {
              onValueChange('')
              // Cleared to type the next term, so the caret stays in the box.
              input.current?.focus()
            }}
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
}
