import { SearchInput } from '@/components/search-input'
import { useRef, useState } from 'react'

const DEBOUNCE_MS = 250

type HeaderSearchProps = {
  initial: string | undefined
  label?: string
  placeholder?: string
  onSearchChange: (search: string | undefined) => void
}

/**
 * A page's search box, which lives in the app header beside the breadcrumb.
 *
 * It owns the term while typing and the URL catches up once the typing stops, so the address bar
 * changes once per pause instead of once per keystroke. Holding that state here also means the header
 * can take this whole box as one node and never re-read it.
 */
export const HeaderSearch = ({
  initial,
  label = 'Search orders',
  placeholder = 'Search orders, customers, product IDs…',
  onSearchChange
}: HeaderSearchProps) => {
  const [term, setTerm] = useState(initial ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  return (
    <SearchInput
      label={label}
      placeholder={placeholder}
      value={term}
      onValueChange={value => {
        setTerm(value)
        clearTimeout(debounce.current)
        // A cleared box is not more typing to wait out: the list comes back at once.
        if (!value) onSearchChange(undefined)
        else debounce.current = setTimeout(() => onSearchChange(value), DEBOUNCE_MS)
      }}
    />
  )
}
