import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type KeyboardEvent } from 'react'
import { stockCardOptionsQuery, type StockCardOption } from '../api'
import { pickedProduct } from '../lib/product-pick'

type ProductPickerProps = {
  /** What is in the box — kept by the caller, so a row can be restored or filled from outside. */
  text: string
  onTextChange: (text: string) => void
  picked: StockCardOption | null
  onPick: (product: StockCardOption | null) => void
  /** Why a product cannot be picked here, said in place of its description; `null` when it can. */
  unavailable?: (product: StockCardOption) => string | null
  id?: string
  label?: string
  placeholder?: string
  className?: string
  invalid?: boolean
}

/**
 * A Product ID picked from EBMS's active Trim products by ID or description — the stock Trim makes.
 * Nothing typed counts until it is a product: picked from the list, or typed in full and left. A
 * manager knows most codes by heart, and tabbing on from one should not need the list.
 */
export const ProductPicker = ({
  text,
  onTextChange,
  picked,
  onPick,
  unavailable,
  id,
  label,
  placeholder = 'Search ID or description…',
  className,
  invalid
}: ProductPickerProps) => {
  const [open, setOpen] = useState(false)
  const client = useQueryClient()
  // A Tab that took an option is a pick already; the blur after it must not look the text up again.
  const tabbedPick = useRef(false)
  // Bumped by every keystroke and pick, so a lookup that answers after either is dropped.
  const edits = useRef(0)
  const search = useDebouncedValue(text.trim(), 250)
  // Asked only with the list open: a grid of these would otherwise search once per row on mount.
  const { data: options = [], isFetching } = useQuery({
    ...stockCardOptionsQuery(search),
    enabled: open
  })

  // Asked again rather than read off the list: the list is a debounce behind the last keystroke.
  const resolveTyped = async () => {
    if (tabbedPick.current) return void (tabbedPick.current = false)
    const typed = text.trim()
    if (!typed || pickedProduct(text, picked)) return
    const asked = edits.current
    const found = await client.fetchQuery(stockCardOptionsQuery(typed))
    if (edits.current !== asked) return
    const exact = found.find(option => option.product_id.toUpperCase() === typed.toUpperCase())
    if (!exact || unavailable?.(exact)) return
    // In the product's own case, so the box and the pick agree.
    onTextChange(exact.product_id)
    onPick(exact)
  }

  const tabToHighlighted = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Tab' || event.shiftKey || !open) return
    // Tab takes the highlighted option as Enter would, then moves on as Tab does.
    const list = document.getElementById(event.currentTarget.getAttribute('aria-controls') ?? '')
    const option = list?.querySelector<HTMLElement>('[data-highlighted]:not([data-disabled])')
    if (!option) return
    tabbedPick.current = true
    option.click()
  }

  return (
    <Combobox
      items={options}
      // The server searches; the list shows what it answered.
      filter={null}
      open={open}
      onOpenChange={setOpen}
      value={pickedProduct(text, picked)}
      onValueChange={option => {
        edits.current++
        onPick(option)
      }}
      inputValue={text}
      onInputValueChange={next => {
        edits.current++
        onTextChange(next)
      }}
      itemToStringLabel={(option: StockCardOption) => option.product_id}
      isItemEqualToValue={(a: StockCardOption, b: StockCardOption) => a.product_id === b.product_id}
    >
      <ComboboxInput
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        className={className}
        placeholder={placeholder}
        onKeyDown={tabToHighlighted}
        onBlur={() => void resolveTyped()}
      />
      {/* Wider than a grid's narrow box: the description is what tells two IDs apart. */}
      <ComboboxContent className='min-w-80'>
        <ComboboxEmpty>
          {isFetching ? 'Searching…' : 'No active Trim product matches.'}
        </ComboboxEmpty>
        <ComboboxList>
          {(option: StockCardOption) => {
            const reason = unavailable?.(option) ?? null
            return (
              <ComboboxItem key={option.product_id} value={option} disabled={reason !== null}>
                <span className='w-28 shrink-0 font-mono'>{option.product_id}</span>
                <span className='min-w-0 flex-1 truncate text-muted-foreground'>
                  {reason ?? option.description ?? '—'}
                </span>
              </ComboboxItem>
            )
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
