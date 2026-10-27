import { toast } from '@/components/ui/toast'
import { toDataURL } from 'qrcode'
import { useEffect, useEffectEvent, useState } from 'react'
import { createPortal } from 'react-dom'

/** One label: what the scanner reads, printed big beside its QR so a person can read it too. */
export type QrLabel = { key: string; code: string; title: string; detail?: string | null }

type QrLabelsProps = {
  /** Mounted for one print: draws the sheet, prints it and hands back through `onDone`. */
  labels: QrLabel[]
  onDone: () => void
}

/**
 * A sheet of QR labels for a forklift scanner to read — a coil's lot number, a location's code. It
 * lives on paper only, like the stock cards: mounted under `<body>` for the print stylesheet
 * (`data-print-report`), printed once every code is drawn, and taken down after.
 */
export const QrLabels = ({ labels, onDone }: QrLabelsProps) => {
  const [codes, setCodes] = useState<Record<string, string> | null>(null)
  // Not a dependency: a parent re-rendering while the sheet draws must not open a second print.
  const finish = useEffectEvent(onDone)

  useEffect(() => {
    let live = true
    void Promise.all(
      labels.map(async label => [label.key, await toDataURL(label.code, { margin: 0 })] as const)
    )
      .then(entries => live && setCodes(Object.fromEntries(entries)))
      .catch(() => {
        if (!live) return
        toast.add({ type: 'error', title: 'The labels could not be drawn' })
        finish()
      })
    return () => {
      live = false
    }
  }, [labels])

  // `print()` holds the page until the dialog closes, so the sheet comes down right after it.
  useEffect(() => {
    if (!codes) return
    window.print()
    finish()
  }, [codes])

  if (!codes) return null

  return createPortal(
    <div data-print-report className='hidden print:block'>
      <div className='grid grid-cols-2 gap-5'>
        {labels.map(label => (
          <article
            key={label.key}
            className='flex break-inside-avoid items-center gap-4 rounded-md border border-black p-3 text-black'
          >
            <img src={codes[label.key]} alt='' className='size-28 shrink-0' />
            <div className='min-w-0'>
              <p className='font-mono text-2xl font-bold break-all'>{label.title}</p>
              {label.detail ? <p className='text-sm'>{label.detail}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </div>,
    document.body
  )
}
