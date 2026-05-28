'use client'
import { RiCheckLine, RiCloseLine, RiExpandUpDownLine } from '@remixicon/react'
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { useDebouncedCallback } from 'use-debounce'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type MultiSelectContextType = {
  open: boolean
  setOpen: (open: boolean) => void
  selectedValues: Set<string>
  toggleValue: (value: string) => void
  items: Map<string, ReactNode>
  onItemAdded: (value: string, label: ReactNode) => void
}
const MultiSelectContext = createContext<MultiSelectContextType | null>(null)

export const MultiSelect = ({
  children,
  values,
  defaultValues,
  onValuesChange
}: {
  children: ReactNode
  values?: string[]
  defaultValues?: string[]
  onValuesChange?: (values: string[]) => void
}) => {
  const [open, setOpen] = useState(false)
  const [internalValues, setInternalValues] = useState(new Set<string>(values ?? defaultValues))
  const selectedValues = values ? new Set(values) : internalValues
  const [items, setItems] = useState<Map<string, ReactNode>>(new Map())

  const toggleValue = (value: string) => {
    const getNewSet = (prev: Set<string>) => {
      const newSet = new Set(prev)
      if (newSet.has(value)) {
        newSet.delete(value)
      } else {
        newSet.add(value)
      }
      return newSet
    }
    setInternalValues(getNewSet)
    onValuesChange?.([...getNewSet(selectedValues)])
  }

  const onItemAdded = useCallback((value: string, label: ReactNode) => {
    setItems((prev) => {
      if (prev.get(value) === label) return prev
      return new Map(prev).set(value, label)
    })
  }, [])

  return (
    <MultiSelectContext
      value={{
        open,
        setOpen,
        selectedValues,
        toggleValue,
        items,
        onItemAdded
      }}
    >
      <Popover
        open={open}
        onOpenChange={setOpen}
        modal={true}
      >
        {children}
      </Popover>
    </MultiSelectContext>
  )
}

export const MultiSelectTrigger = ({
  className,
  children,
  ...props
}: {
  className?: string
  children?: ReactNode
} & ComponentPropsWithoutRef<typeof Button>) => {
  const { open } = useMultiSelectContext()

  return (
    <PopoverTrigger asChild>
      <Button
        {...props}
        variant={props.variant ?? 'outline'}
        role={props.role ?? 'combobox'}
        aria-expanded={props['aria-expanded'] ?? open}
        className={cn('justify-between hover:bg-transparent', className)}
      >
        {children}
        <RiExpandUpDownLine className='size-4 shrink-0 opacity-50' />
      </Button>
    </PopoverTrigger>
  )
}

export const MultiSelectValue = ({
  placeholder,
  clickToRemove = true,
  className,
  overflowBehavior = 'wrap-when-open',
  ...props
}: {
  placeholder?: string
  clickToRemove?: boolean
  overflowBehavior?: 'wrap' | 'wrap-when-open' | 'cutoff'
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>) => {
  const { selectedValues, toggleValue, items, open } = useMultiSelectContext()
  const [overflowAmount, setOverflowAmount] = useState(0)
  const valueRef = useRef<HTMLDivElement>(null)
  const overflowRef = useRef<HTMLDivElement>(null)

  const shouldWrap = overflowBehavior === 'wrap' || (overflowBehavior === 'wrap-when-open' && open)

  const checkOverflow = useCallback(() => {
    if (valueRef.current == null) return

    const containerElement = valueRef.current
    const overflowElement = overflowRef.current
    const items = containerElement.querySelectorAll<HTMLElement>('[data-selected-item]')

    if (overflowElement != null) overflowElement.style.display = 'none'
    items.forEach((child) => child.style.removeProperty('display'))
    let amount = 0
    for (let i = items.length - 1; i >= 0; i--) {
      const child = items[i]!
      if (containerElement.scrollWidth <= containerElement.clientWidth) {
        break
      }
      amount = items.length - i
      child.style.display = 'none'
      overflowElement?.style.removeProperty('display')
    }
    setOverflowAmount(amount)
  }, [])

  const debouncedCheckOverflow = useDebouncedCallback(checkOverflow, 100)

  const handleResize = useCallback(
    (node: HTMLDivElement) => {
      valueRef.current = node

      const mutationObserver = new MutationObserver(checkOverflow)
      const observer = new ResizeObserver(() => debouncedCheckOverflow())

      mutationObserver.observe(node, {
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      })
      observer.observe(node)

      return () => {
        observer.disconnect()
        mutationObserver.disconnect()
        valueRef.current = null
      }
    },
    [checkOverflow]
  )

  if (selectedValues.size === 0 && placeholder) {
    return (
      <span className='text-muted-foreground min-w-0 overflow-hidden font-normal'>
        {placeholder}
      </span>
    )
  }

  return (
    <div
      {...props}
      ref={handleResize}
      className={cn(
        'flex w-full gap-1.5 overflow-hidden',
        shouldWrap && 'h-full flex-wrap',
        className
      )}
    >
      {[...selectedValues]
        .filter((value) => items.has(value))
        .map((value) => (
          <Badge
            variant='secondary'
            data-selected-item
            className='group flex items-center gap-1'
            key={value}
            onClick={
              clickToRemove
                ? (e) => {
                    e.stopPropagation()
                    toggleValue(value)
                  }
                : undefined
            }
          >
            {items.get(value)}
            {clickToRemove && (
              <RiCloseLine className='text-muted-foreground group-hover:text-destructive size-2' />
            )}
          </Badge>
        ))}
      <Badge
        style={{
          display: overflowAmount > 0 && !shouldWrap ? 'block' : 'none'
        }}
        variant='outline'
        ref={overflowRef}
      >
        +{overflowAmount}
      </Badge>
    </div>
  )
}

export const MultiSelectContent = ({
  search = true,
  children,
  ...props
}: {
  search?: boolean | { placeholder?: string; emptyMessage?: string }
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<typeof Command>, 'children'>) => {
  const canSearch = typeof search === 'object' ? true : search

  return (
    <>
      <div style={{ display: 'none' }}>
        <Command>
          <CommandList>{children}</CommandList>
        </Command>
      </div>
      <PopoverContent className='min-w-(--radix-popover-trigger-width) p-0'>
        <Command {...props}>
          {canSearch ? (
            <CommandInput
              placeholder={typeof search === 'object' ? search.placeholder : undefined}
            />
          ) : (
            <button
              autoFocus
              className='sr-only'
            />
          )}
          <CommandList>
            {canSearch && (
              <CommandEmpty>
                {typeof search === 'object' ? search.emptyMessage : undefined}
              </CommandEmpty>
            )}
            {children}
          </CommandList>
        </Command>
      </PopoverContent>
    </>
  )
}

export const MultiSelectItem = ({
  value,
  children,
  badgeLabel,
  onSelect,
  ...props
}: {
  badgeLabel?: ReactNode
  value: string
} & Omit<ComponentPropsWithoutRef<typeof CommandItem>, 'value'>) => {
  const { toggleValue, selectedValues, onItemAdded } = useMultiSelectContext()
  const isSelected = selectedValues.has(value)

  useEffect(() => {
    onItemAdded(value, badgeLabel ?? children)
  }, [value, children, onItemAdded, badgeLabel])

  return (
    <CommandItem
      {...props}
      onSelect={() => {
        toggleValue(value)
        onSelect?.(value)
      }}
    >
      <RiCheckLine className={cn('mr-2 size-4', isSelected ? 'opacity-100' : 'opacity-0')} />
      {children}
    </CommandItem>
  )
}

export const MultiSelectGroup = (props: ComponentPropsWithoutRef<typeof CommandGroup>) => {
  return <CommandGroup {...props} />
}

export const MultiSelectSeparator = (props: ComponentPropsWithoutRef<typeof CommandSeparator>) => {
  return <CommandSeparator {...props} />
}

const useMultiSelectContext = () => {
  const context = useContext(MultiSelectContext)
  if (context == null) {
    throw new Error('useMultiSelectContext must be used within a MultiSelectContext')
  }
  return context
}
