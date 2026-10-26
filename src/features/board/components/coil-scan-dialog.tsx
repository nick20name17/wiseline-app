import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { ScanLine } from 'lucide-react'
import { useRef, useState } from 'react'
import { useScanMove } from '../api'
import { coilName } from '../lib/coils'

/**
 * The forklift's way to put a coil away: scan the coil's label, then the location's. A scanner types
 * the code and presses Enter, so the box takes one code at a time and is ready for the next.
 */
export const CoilScanDialog = () => {
  const [open, setOpen] = useState(false)
  const [coil, setCoil] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const move = useScanMove()
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setCoil(null)
    setCode('')
  }

  const submit = () => {
    const scanned = code.trim()
    if (!scanned || move.isPending) return
    setCode('')
    if (coil === null) return setCoil(scanned)
    move.mutate(
      { coil, location: scanned },
      {
        onSuccess: lot =>
          toast.add({
            type: 'success',
            title: `Coil ${coilName(lot)} is on ${lot.location ?? scanned}`
          }),
        // A refusal starts over too: the server answers an unknown coil and an unknown location
        // alike, and keeping an unknown coil would fail every location scanned after it.
        onSettled: () => setCoil(null)
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={<Button variant='outline' />}>
        <ScanLine data-icon='inline-start' />
        Scan
      </DialogTrigger>
      <DialogContent initialFocus={inputRef}>
        <DialogHeader>
          <DialogTitle>Scan a coil to put it away</DialogTitle>
          <DialogDescription>
            {coil === null
              ? 'Scan the coil’s label.'
              : `Coil ${coil} — now scan the location it goes on.`}
          </DialogDescription>
        </DialogHeader>
        <form
          className='flex gap-2'
          onSubmit={event => {
            event.preventDefault()
            submit()
          }}
        >
          <Input
            ref={inputRef}
            aria-label={coil === null ? 'Coil lot number' : 'Location code'}
            placeholder={coil === null ? 'Lot number' : 'Location code'}
            value={code}
            onChange={event => setCode(event.target.value)}
          />
          <Button type='submit' disabled={!code.trim() || move.isPending}>
            Enter
          </Button>
          {coil === null ? null : (
            <Button type='button' variant='ghost' onClick={reset}>
              Start over
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
