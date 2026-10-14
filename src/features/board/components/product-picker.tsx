import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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
 * Nothing typed counts until it is picked from the list.
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
  const search = useDebouncedValue(text.trim(), 250)
  // Asked only with the list open: a grid of these would otherwise search once per row on mount.
  const { data: options = [], isFetching } = useQuery({
    ...stockCardOptionsQuery(search),
    enabled: open
  })

  return (
    <Combobox
      items={options}
      // The server searches; the list shows what it answered.
      filter={null}
      open={open}
      onOpenChange={setOpen}
      value={pickedProduct(text, picked)}
      onValueChange={onPick}
      inputValue={text}
      onInputValueChange={next => onTextChange(next)}
      itemToStringLabel={(option: StockCardOption) => option.product_id}
      isItemEqualToValue={(a: StockCardOption, b: StockCardOption) => a.product_id === b.product_id}
    >
      <ComboboxInput
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        className={className}
        placeholder={placeholder}
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
