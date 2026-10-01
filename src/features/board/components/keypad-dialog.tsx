import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useRetained } from '@/lib/use-retained'
import { Delete, X } from 'lucide-react'
import { useState } from 'react'
import { applyKeypad, decimalKeypad } from '../lib/wrapping'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

type KeypadDialogProps = {
  /** `max` caps a count; a measure has none. */
  target: { title: string; current: number; max?: number } | null
  /**
   * A measure rather than a count, like a coil's thickness in inches p1 (486,399): a decimal point
   * instead of +/−, and no ceiling.
   */
  decimal?: boolean
  unit?: string
  isPending?: boolean
  onOpenChange: (open: boolean) => void
  onEnter: (value: number) => void
}

/**
 * The floor's keypad: a figure is replaced by typing it, or moved by «+10» / «-5» (p1 (750,386)). The
 * keys are big because it is used standing at the bench, often on a touch screen.
 */
export const KeypadDialog = ({
  target: current,
  decimal = false,
  unit = 'pcs.',
  isPending,
  onOpenChange,
  onEnter
}: KeypadDialogProps) => {
  const [target, release] = useRetained(current)
  const [typed, setTyped] = useState('')
  const next = !target
    ? null
    : decimal
      ? decimalKeypad(typed)
      : applyKeypad(target.current, typed, target.max ?? Infinity)
  const keys = decimal ? [...DIGITS, '.', '0'] : [...DIGITS, '+', '0', '-']

  const press = (key: string) =>
    setTyped(value =>
      // A sign only leads; typing one after digits starts the entry over with it.
      key === '+' || key === '-' ? key : key === '.' && value.includes('.') ? value : value + key
    )

  return (
    <Dialog
      open={!!current}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={open => {
        if (!open) setTyped('')
        release(open)
      }}
    >
      <DialogContent className='sm:max-w-xs'>
        <DialogHeader>
          <DialogTitle>{target?.title}</DialogTitle>
          <DialogDescription>
            {decimal
              ? `Now ${target?.current ?? 0} ${unit} Type the new figure.`
              : `Now ${target?.current ?? 0} of ${target?.max ?? 0}. Type a new figure, or +/− to adjust.`}
          </DialogDescription>
        </DialogHeader>

        <div className='flex items-baseline justify-between rounded-md border border-border px-3 py-2'>
          <span className='font-mono text-2xl'>{typed || '—'}</span>
          <span className='font-mono text-sm text-muted-foreground'>
            {next === null ? unit : `→ ${next} ${unit}`}
          </span>
        </div>

        <div className='grid grid-cols-3 gap-2'>
          {keys.map(key => (
            <Button
              key={key}
              variant='outline'
              size='lg'
              className='h-12'
              onClick={() => press(key)}
            >
              <span className='font-mono text-lg'>{key === '-' ? '−' : key}</span>
            </Button>
          ))}
          <Button
            variant='outline'
            size='lg'
            className='h-12'
            aria-label='Delete last'
            onClick={() => setTyped(value => value.slice(0, -1))}
          >
            <Delete />
          </Button>
          <Button
            variant='destructive'
            size='lg'
            className='h-12'
            aria-label='Clear'
            onClick={() => setTyped('')}
          >
            <X />
          </Button>
          {/* The measure's pad has no +/−, so its Enter takes the spare cell. */}
          <Button
            size='lg'
            className={decimal ? 'col-span-2 h-12' : 'h-12'}
            disabled={next === null || isPending}
            onClick={() => next !== null && onEnter(next)}
          >
            {isPending ? <Spinner /> : 'Enter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
