import { toast } from '@/components/ui/toast'
import { toDataURL } from 'qrcode'
import { useEffect, useEffectEvent, useState } from 'react'
import { createPortal } from 'react-dom'
import type { StockCardLabel } from '../api'

/** A label as printed: what the server says it carries, and the picture only the card knows. */
export type PrintedLabel = StockCardLabel & { image_url: string | null }

// How long the sheet waits on the sketches before it prints without the late ones.
const SKETCH_WAIT_MS = 10_000

type LabelProps = { label: PrintedLabel; qr: string | undefined }

/**
 * One card as the floor gets it Screen (122,324): the sketch on the left, the QR top right, the
 * product and its width, the description in capitals, and the two figures boxed at the foot.
 */
const Label = ({ label, qr }: LabelProps) => (
  <article className='flex h-54 break-inside-avoid flex-col gap-2 rounded-md border border-black p-3 text-black'>
    <div className='flex min-h-0 flex-1 gap-3'>
      <div className='flex w-26 shrink-0 items-center justify-center'>
        {label.image_url ? (
          <img src={label.image_url} alt='' className='max-h-full max-w-full object-contain' />
        ) : null}
      </div>
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <p className='font-mono text-base font-bold'>{label.product_id}</p>
            {label.width === null ? null : <p className='text-xs'>Width: {label.width}&quot;</p>}
          </div>
          {qr ? <img src={qr} alt='' className='size-20 shrink-0' /> : null}
        </div>
        <p className='mt-auto line-clamp-2 text-sm font-bold uppercase'>{label.description}</p>
      </div>
    </div>
    <div className='grid grid-cols-2 gap-2'>
      {[
        ['Stock Minimum', label.stock_minimum],
        ['Order Qty', label.order_qty]
      ].map(([name, value]) => (
        <div key={name} className='rounded-sm border border-black px-2 py-1'>
          <p className='text-xs tracking-wider uppercase'>{name}</p>
          <p className='font-mono text-lg leading-tight font-bold'>{value ?? '—'}</p>
        </div>
      ))}
    </div>
  </article>
)

type StockCardLabelsProps = {
  /** Mounted for one print: draws the sheet, prints it and hands back through `onDone`. */
  labels: PrintedLabel[]
  onDone: () => void
}

/**
 * The sheet Print Selected sends to the printer. It lives on paper only: mounted off screen under
 * `<body>`, where the print stylesheet (`data-print-report`) leaves it alone on the page. The browser's
 * print dialog opens once every QR is drawn and every sketch has loaded, or a label would print blank.
 */
export const StockCardLabels = ({ labels, onDone }: StockCardLabelsProps) => {
  const [codes, setCodes] = useState<Record<number, string>>({})
  const [waiting, setWaiting] = useState<number | null>(null)

  // Not a dependency: a parent re-rendering while the sheet waits must not open a second print.
  const finish = useEffectEvent(onDone)

  useEffect(() => {
    let live = true
    void Promise.all(
      labels.map(async label => [
        label.id,
        label.qr ? await toDataURL(label.qr, { margin: 0 }) : ''
      ])
    )
      .then(entries => {
        if (!live) return
        setCodes(Object.fromEntries(entries))
        setWaiting(labels.filter(label => label.image_url).length)
      })
      .catch(() => {
        if (!live) return
        toast.add({ type: 'error', title: 'The labels could not be drawn' })
        finish()
      })
    // A sketch that never answers must not hold the sheet back for good; it prints without it.
    const stalled = window.setTimeout(
      () => live && setWaiting(left => (left ? 0 : left)),
      SKETCH_WAIT_MS
    )
    return () => {
      live = false
      window.clearTimeout(stalled)
    }
  }, [labels])

  // `print()` holds the page until the dialog closes, so the sheet comes down right after it. Waiting
  // for `afterprint` instead would leave it mounted — taking over every later print — wherever the
  // browser never sends one.
  useEffect(() => {
    if (waiting !== 0) return
    window.print()
    finish()
  }, [waiting])

  if (waiting === null) return null
  // A sketch that fails to load still lets the sheet print, without it.
  const loaded = () => setWaiting(left => (left === null ? left : left - 1))

  return createPortal(
    <div data-print-report className='hidden print:block'>
      <div className='grid grid-cols-2 gap-5'>
        {labels.map(label => (
          <Label key={label.id} label={label} qr={codes[label.id] || undefined} />
        ))}
      </div>
      {/* The sketches are watched here rather than in each label, so the count lives in one place. */}
      {labels.map(label =>
        label.image_url ? (
          <img
            key={label.id}
            src={label.image_url}
            alt=''
            className='hidden'
            onLoad={loaded}
            onError={loaded}
          />
        ) : null
      )}
    </div>,
    document.body
  )
}
