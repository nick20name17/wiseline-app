import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from 'cn'
import { CircleAlert, CircleCheck, CircleX, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useScanPackage, type PackageScan } from '../api'

// The label's department part, as the departments' package codes number them.
const DEPARTMENT_CODE: Record<string, string> = {
  '01': 'Trim',
  '02': 'Rollforming',
  '03': 'Accessories'
}

const RESULT = {
  ok: {
    icon: CircleCheck,
    tone: 'border-success/40',
    badge: 'bg-success/10 text-success',
    title: 'Valid package'
  },
  deleted: {
    icon: CircleX,
    tone: 'border-destructive/40',
    badge: 'bg-destructive/10 text-destructive',
    title: 'This package has been deleted'
  },
  unknown: {
    icon: CircleAlert,
    tone: 'border-warning/40',
    badge: 'bg-warning/10 text-warning',
    title: 'Unknown label'
  }
} as const

const LOG_DOT = { ok: 'bg-success', deleted: 'bg-destructive', unknown: 'bg-warning' } as const
const LOG_TEXT = { ok: 'Valid', deleted: 'Deleted — rejected', unknown: 'Unknown' } as const

/** A label reads department, order number, then the package's count on the order. */
const partsOf = (name: string) => {
  const [code = '', ...rest] = name.split('-')
  const count = rest.length > 1 ? rest.at(-1) : undefined
  return {
    department: DEPARTMENT_CODE[code] ? `${DEPARTMENT_CODE[code]} (${code})` : code,
    order: rest.slice(0, count ? -1 : undefined).join('-'),
    count
  }
}

const Row = ({
  label,
  children,
  mono
}: {
  label: string
  children: React.ReactNode
  mono?: boolean
}) => (
  <div className='flex justify-between gap-4 border-t border-border px-4 py-2 text-sm'>
    <span className='text-muted-foreground'>{label}</span>
    <span className={cn('text-right', mono && 'font-mono')}>{children}</span>
  </div>
)

const ScanResult = ({ scan }: { scan: PackageScan }) => {
  const { icon: Icon, tone, badge, title } = RESULT[scan.status]
  const parts = partsOf(scan.name)
  return (
    <output className={cn('block overflow-hidden rounded-lg border bg-card', tone)}>
      <div className='flex items-center gap-3 px-4 py-3'>
        <span className={cn('grid size-8 flex-none place-items-center rounded-full', badge)}>
          <Icon className='size-4' />
        </span>
        <div className='min-w-0'>
          <p className='font-semibold'>{title}</p>
          <p className='truncate font-mono text-xs text-muted-foreground'>
            {scan.status === 'ok'
              ? scan.name
              : `${scan.name} — ${scan.status === 'deleted' ? 'rejected server-side' : 'no matching package'}`}
          </p>
        </div>
      </div>
      {scan.status === 'ok' ? (
        <>
          <Row label='Department'>{parts.department}</Row>
          <Row label='Order #' mono>
            {parts.order}
          </Row>
          {parts.count ? (
            <Row label='Package #' mono>
              {parts.count}
            </Row>
          ) : null}
        </>
      ) : scan.status === 'deleted' ? (
        <Row label='What to do'>
          Do not load or ship. Re-print from the department if the package still exists.
        </Row>
      ) : null}
    </output>
  )
}

type LogEntry = { at: string; scan: PackageScan }

/**
 * The package scanner p1 (835,528): a label goes in, and the answer is valid, deleted or unknown. A
 * deleted label still scans, and is rejected rather than quietly missing.
 */
export const ScannerPage = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState('')
  const [log, setLog] = useState<LogEntry[]>([])
  const scan = useScanPackage()

  // A scanner gun types into whatever holds focus, so the box holds it from the start.
  useEffect(() => inputRef.current?.focus(), [])

  // A handheld scanner types into the focused box and ends with Enter; the box empties for the next.
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const name = code.trim()
    if (!name) return
    scan.mutate(name, {
      onSuccess: result =>
        setLog(current => [
          {
            at: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            scan: result
          },
          ...current
        ])
    })
    setCode('')
    inputRef.current?.focus()
  }

  return (
    <section className='mx-auto flex w-full max-w-xl flex-col gap-5'>
      <div>
        <h1 className='text-xl font-semibold'>Package scanner</h1>
        <p className='text-sm text-muted-foreground'>
          Scan or type a package label. Every scan is checked server-side — deleted packages are
          rejected.
        </p>
      </div>

      <form onSubmit={submit} className='flex gap-2'>
        <Input
          ref={inputRef}
          aria-label='Package barcode'
          autoComplete='off'
          placeholder='01-W41219-1'
          value={code}
          onChange={event => setCode(event.target.value)}
        />
        {/* Not disabled while a check runs: a disabled default button swallows the scanner's Enter. */}
        <Button type='submit' disabled={!code.trim()}>
          {scan.isPending ? (
            <Spinner data-icon='inline-start' />
          ) : (
            <ScanLine data-icon='inline-start' />
          )}
          Scan
        </Button>
      </form>

      {scan.data ? <ScanResult scan={scan.data} /> : null}

      <div className='overflow-hidden rounded-lg border border-border bg-card'>
        <h2 className='px-4 py-2.5 text-sm font-medium'>Recent scans</h2>
        {log.length ? (
          <ul>
            {log.map((entry, index) => (
              <li
                // Scans repeat; a position is the only stable identity this list has.
                // oxlint-disable-next-line react/no-array-index-key
                key={index}
                className='flex items-center gap-3 border-t border-border px-4 py-2 text-sm'
              >
                <span className={cn('size-2 flex-none rounded-full', LOG_DOT[entry.scan.status])} />
                <span className='font-mono'>{entry.scan.name}</span>
                <span className='font-mono text-xs text-muted-foreground'>{entry.at}</span>
                <span className='ml-auto text-muted-foreground'>{LOG_TEXT[entry.scan.status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='border-t border-border px-4 py-6 text-center text-sm text-muted-foreground'>
            No scans yet — scan a label above.
          </p>
        )}
      </div>
    </section>
  )
}
