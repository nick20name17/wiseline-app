import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Search } from 'lucide-react'
import { useRef, useState } from 'react'

const DEBOUNCE_MS = 250

type BoardSearchProps = {
  initial: string | undefined
  onSearchChange: (search: string | undefined) => void
}

/**
 * The board's search box, which lives in the app header beside the breadcrumb.
 *
 * It owns the term while typing and the URL catches up once the typing stops, so the address bar
 * changes once per pause instead of once per keystroke. Holding that state here also means the header
 * can take this whole box as one node and never re-read it.
 */
export const BoardSearch = ({ initial, onSearchChange }: BoardSearchProps) => {
  const [term, setTerm] = useState(initial ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  return (
    <InputGroup>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        type='search'
        aria-label='Search orders'
        placeholder='Search orders, customers, product IDs…'
        value={term}
        onChange={event => {
          setTerm(event.target.value)
          clearTimeout(debounce.current)
          debounce.current = setTimeout(
            () => onSearchChange(event.target.value || undefined),
            DEBOUNCE_MS
          )
        }}
      />
    </InputGroup>
  )
}
