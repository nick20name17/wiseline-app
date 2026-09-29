import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from 'cn'
import { CircleCheck, CircleX, ScanBarcode, TriangleAlert } from 'lucide-react'
import { useRef, useState, type FormEvent, type RefObject } from 'react'
import { useScanPackage, type PackageScan } from '../api'

const RESULT = {
  ok: { icon: CircleCheck, tone: 'border-success/40 bg-success/10 text-success' },
  deleted: { icon: CircleX, tone: 'border-destructive/40 bg-destructive/10 text-destructive' },
  unknown: { icon: TriangleAlert, tone: 'border-warning/40 bg-warning/10 text-warning' }
} as const

const ScanResult = ({ scan }: { scan: PackageScan }) => {
  const { icon: Icon, tone } = RESULT[scan.status]
  return (
    <output className={cn('flex items-start gap-2 rounded-md border px-3 py-2', tone)}>
      <Icon className='mt-0.5 size-4 shrink-0' />
      <div className='min-w-0'>
        <p className='font-mono font-semibold'>{scan.name}</p>
        <p className='text-sm'>
          {scan.status === 'ok' ? 'A live package.' : (scan.detail ?? 'No such package.')}
        </p>
      </div>
    </output>
  )
}

const ScanForm = ({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) => {
  const [code, setCode] = useState('')
  const scan = useScanPackage()

  // A handheld scanner types into the focused box and ends with Enter, which submits the form; the
  // box is emptied and focused again for the next label, even after a click on Check.
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const name = code.trim()
    if (!name) return
    scan.mutate(name)
    setCode('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={submit} className='flex flex-col gap-4'>
      <Field>
        <FieldLabel htmlFor='package-barcode'>Package barcode</FieldLabel>
        <div className='flex gap-2'>
          <Input
            id='package-barcode'
            ref={inputRef}
            autoComplete='off'
            placeholder='Scan or type a label'
            value={code}
            onChange={event => setCode(event.target.value)}
          />
          {/* Not disabled while a check runs: a disabled default button swallows the scanner's Enter, and
              the next label would land on the end of this one. */}
          <Button type='submit' disabled={!code.trim()}>
            {scan.isPending ? <Spinner data-icon='inline-start' /> : null}
            Check
          </Button>
        </div>
      </Field>
      {scan.data ? <ScanResult scan={scan.data} /> : null}
    </form>
  )
}

/** p1 (835,528): a label scanned after its package was deleted says so. */
export const ScanPackageDialog = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <Dialog>
      <DialogTrigger render={<Button variant='outline' className='mb-1.5' />}>
        <ScanBarcode data-icon='inline-start' />
        Scan package
      </DialogTrigger>
      <DialogContent className='sm:max-w-md' initialFocus={inputRef}>
        <DialogHeader>
          <DialogTitle>Scan package</DialogTitle>
          <DialogDescription>Check a package label before it goes anywhere.</DialogDescription>
        </DialogHeader>
        {/* The popup unmounts once closed, so the last result is not there the next time it opens. */}
        <ScanForm inputRef={inputRef} />
      </DialogContent>
    </Dialog>
  )
}
