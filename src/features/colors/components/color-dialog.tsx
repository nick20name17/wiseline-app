import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { coilOptionsQuery, useSaveColor, type CoilOptions, type Color } from '../api'
import { suggestedTexts } from '../lib/suggest'

const HEX = /^#(?:[0-9a-f]{3}){1,2}$/i

/** `#RGB` as `#RRGGBB`, the only form the browser's colour picker takes. */
const longHex = (hex: string) =>
  hex.length === 4 ? hex.replace(/[0-9a-f]/gi, digit => digit + digit) : hex

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every(key => b.has(key))

type Option = {
  key: string
  label: string
  detail: string | null
  /** The colour that already has it, when that is another one. */
  taken: string | null
  suggested: boolean
}

type OptionListProps = {
  title: string
  hint: string
  options: Option[]
  picked: ReadonlySet<string>
  /** What the colour had when the window opened — the order holds still while ticking. */
  kept: ReadonlySet<string>
  onToggle: (key: string) => void
}

/** One of the two lists a colour's coils are picked from, suggestions on top. */
const OptionList = ({ title, hint, options, picked, kept, onToggle }: OptionListProps) => {
  const [term, setTerm] = useState('')
  const query = term.trim().toLowerCase()
  const shown = options
    .filter(
      option =>
        !query ||
        option.label.toLowerCase().includes(query) ||
        option.detail?.toLowerCase().includes(query)
    )
    // What the colour has first, then what its name suggests, then the rest as EBMS lists them.
    .sort(
      (a, b) =>
        Number(kept.has(b.key)) - Number(kept.has(a.key)) ||
        Number(b.suggested) - Number(a.suggested)
    )

  return (
    <section className='flex min-w-0 flex-col gap-2'>
      <div className='flex items-baseline justify-between gap-2'>
        <h3 className='text-sm font-medium'>
          {title} · {[...picked].filter(key => options.some(o => o.key === key)).length}
        </h3>
        <span className='text-xs text-muted-foreground'>{hint}</span>
      </div>
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          type='search'
          aria-label={`Search ${title.toLowerCase()}`}
          placeholder='Search...'
          value={term}
          onChange={event => setTerm(event.target.value)}
        />
      </InputGroup>
      <ul className='scrollport flex h-64 flex-col overflow-y-auto rounded-lg border border-border'>
        {shown.map(option => (
          <li key={option.key} className='border-b border-border last:border-b-0'>
            <label className='flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm has-disabled:cursor-not-allowed has-disabled:text-muted-foreground'>
              <Checkbox
                checked={picked.has(option.key)}
                disabled={!!option.taken}
                onCheckedChange={() => onToggle(option.key)}
              />
              <span className='min-w-0 flex-1 truncate'>
                {option.label}
                {option.detail ? (
                  <span className='text-muted-foreground'> · {option.detail}</span>
                ) : null}
              </span>
              {option.taken ? (
                <span className='shrink-0 text-xs'>{option.taken}</span>
              ) : option.suggested && !picked.has(option.key) ? (
                <span className='shrink-0 text-xs text-primary'>Suggested</span>
              ) : null}
            </label>
          </li>
        ))}
        {!shown.length ? (
          <li className='px-3 py-6 text-center text-sm text-muted-foreground'>Nothing matches.</li>
        ) : null}
      </ul>
    </section>
  )
}

const optionsFor = (color: Color, coils: CoilOptions) => {
  const others = (owner: string | null) =>
    owner && owner.toLowerCase() !== color.name.toLowerCase() ? owner : null
  const suggested = new Set(suggestedTexts(color.name, coils.coil_colors))
  return {
    texts: coils.coil_colors.map<Option>(option => ({
      key: option.text,
      label: option.text,
      detail: `${option.coils} coil${option.coils === 1 ? '' : 's'}`,
      taken: others(option.color),
      suggested: suggested.has(option.text)
    })),
    products: coils.coil_products.map<Option>(option => ({
      key: option.product_id,
      label: option.product_id,
      detail: option.description,
      taken: others(option.color),
      suggested: false
    }))
  }
}

type ColorFormProps = {
  color: Color
  coils: CoilOptions
  onDone: () => void
}

const ColorForm = ({ color, coils, onDone }: ColorFormProps) => {
  const [hex, setHex] = useState(color.hex ?? '')
  const [keptTexts] = useState(() => new Set(color.coil_colors))
  const [keptProducts] = useState(() => new Set(color.coil_products))
  const [texts, setTexts] = useState<Set<string>>(() => new Set(keptTexts))
  const [products, setProducts] = useState<Set<string>>(() => new Set(keptProducts))
  const save = useSaveColor(onDone)
  const options = optionsFor(color, coils)
  const badHex = hex.trim() !== '' && !HEX.test(hex.trim())
  // Saving what was already there would only make an empty row for a colour nothing is kept for yet.
  const changed =
    hex.trim() !== (color.hex ?? '') ||
    !sameSet(texts, keptTexts) ||
    !sameSet(products, keptProducts)

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  }

  return (
    <form
      noValidate
      className='flex flex-col gap-5'
      onSubmit={event => {
        event.preventDefault()
        if (badHex) return
        save.mutate({
          id: color.id,
          payload: {
            name: color.name,
            hex: hex.trim() || null,
            coil_colors: [...texts],
            coil_products: [...products]
          }
        })
      }}
    >
      <Field data-invalid={badHex || undefined} className='max-w-xs'>
        <FieldLabel htmlFor='color-hex'>Swatch</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <input
              type='color'
              aria-label='Pick the swatch'
              className='size-5 cursor-pointer rounded-sm border-0 bg-transparent p-0'
              value={HEX.test(hex.trim()) ? longHex(hex.trim()) : '#000000'}
              onChange={event => setHex(event.target.value)}
            />
          </InputGroupAddon>
          <InputGroupInput
            id='color-hex'
            placeholder='#RRGGBB'
            maxLength={7}
            aria-invalid={badHex || undefined}
            value={hex}
            onChange={event => setHex(event.target.value)}
          />
        </InputGroup>
        <FieldError errors={badHex ? [{ message: 'A hex color, like #3A3A3C' }] : []} />
      </Field>

      <div className='grid gap-5 md:grid-cols-2'>
        <OptionList
          title='Coil colors'
          hint='every coil that reads so'
          options={options.texts}
          picked={texts}
          kept={keptTexts}
          onToggle={key => setTexts(current => toggle(current, key))}
        />
        <OptionList
          title='Coil products with no color'
          hint='EBMS gives these none'
          options={options.products}
          picked={products}
          kept={keptProducts}
          onToggle={key => setProducts(current => toggle(current, key))}
        />
      </div>

      <div className='flex justify-end gap-2'>
        <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
        <Button type='submit' disabled={save.isPending || badHex || !changed}>
          {save.isPending ? <Spinner data-icon='inline-start' /> : null}
          Save
        </Button>
      </div>
    </form>
  )
}

type ColorDialogProps = {
  color: Color | null
  onOpenChange: (open: boolean) => void
}

/**
 * Which coils are of this colour: Cutlist Coils lists a Slinet coil for a cutlist when its colour text
 * or its product is linked here p1 (426,341). The texts the name suggests are marked, never ticked
 * for the Manager — «Charcoal Lynx» names Charcoal and is most likely not it.
 */
export const ColorDialog = ({ color: current, onOpenChange }: ColorDialogProps) => {
  const [color, release] = useRetained(current)
  const { data: coils, isPending } = useQuery({ ...coilOptionsQuery, enabled: !!current })

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent className='sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>{color?.name ?? ''}</DialogTitle>
          <DialogDescription>
            Tick the coils that are this color. A cutlist in {color?.name ?? 'it'} lists them once
            they are in the Slinet.
          </DialogDescription>
        </DialogHeader>
        {color && coils ? (
          <ColorForm
            key={color.name}
            color={color}
            coils={coils}
            onDone={() => onOpenChange(false)}
          />
        ) : isPending ? (
          <Skeleton className='h-80' />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
