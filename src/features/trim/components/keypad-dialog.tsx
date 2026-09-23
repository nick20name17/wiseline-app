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
import { applyKeypad } from '../lib/wrapping'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', '-'] as const

export type KeypadTarget = { title: string; current: number; max: number }

type KeypadDialogProps = {
  target: KeypadTarget | null
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
  isPending,
  onOpenChange,
  onEnter
}: KeypadDialogProps) => {
  const [target, release] = useRetained(current)
  const [typed, setTyped] = useState('')
  const next = target ? applyKeypad(target.current, typed, target.max) : null

  const press = (key: string) =>
    // A sign only leads; typing one after digits starts the entry over with it.
    setTyped(value => (key === '+' || key === '-' ? key : value + key))

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
            Now {target?.current ?? 0} of {target?.max ?? 0}. Type a new figure, or +/− to adjust.
          </DialogDescription>
        </DialogHeader>

        <div className='flex items-baseline justify-between rounded-md border border-border px-3 py-2'>
          <span className='font-mono text-2xl'>{typed || '—'}</span>
          <span className='font-mono text-sm text-muted-foreground'>
            {next === null ? 'pcs.' : `→ ${next} pcs.`}
          </span>
        </div>

        <div className='grid grid-cols-3 gap-2'>
          {KEYS.map(key => (
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
          <Button
            size='lg'
            className='h-12'
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
