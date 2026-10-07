import { toast } from '@/components/ui/toast'
import { toDataURL } from 'qrcode'
import { useEffect, useEffectEvent, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PackageLabel } from '../lib/package-label'

type SheetProps = { label: PackageLabel; onDone: () => void }

/**
 * The label on paper: the code to scan, the order, where it stands, what it weighs and holds. It is
 * the browser's to print — the server runs in the cloud, the printers on the shop network (round 8
 * answers, B6) — mounted off screen under `<body>` for the print stylesheet to keep alone.
 */
export const PackageLabelSheet = ({ label, onDone }: SheetProps) => {
  const [qr, setQr] = useState<string | null>(null)
  // Not a dependency: a parent re-rendering while the code is drawn must not open a second print.
  const finish = useEffectEvent(onDone)

  useEffect(() => {
    let live = true
    toDataURL(label.name, { margin: 0 })
      .then(code => live && setQr(code))
      .catch(() => {
        if (!live) return
        toast.add({ type: 'error', title: `Label ${label.name} could not be drawn` })
        finish()
      })
    return () => {
      live = false
    }
  }, [label.name])

  // `print()` holds the page until the dialog closes, so the sheet comes down right after it.
  useEffect(() => {
    if (!qr) return
    window.print()
    finish()
  }, [qr])

  if (!qr) return null

  return createPortal(
    <div data-print-report className='hidden print:block'>
      <article className='flex flex-col gap-3 rounded-md border border-black p-4 text-black'>
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <p className='font-mono text-2xl font-bold'>{label.name}</p>
            <p className='text-lg'>Order {label.orderNumber}</p>
            <p className='text-base'>
              Location <b className='font-mono'>{label.location ?? '—'}</b>
              {label.weight === null ? null : <> · {label.weight} lb</>}
            </p>
          </div>
          <img src={qr} alt='' className='size-28 shrink-0' />
        </div>
        <table className='w-full text-sm'>
          <tbody>
            {label.contents.map(line => (
              <tr key={line.product} className='border-t border-black'>
                <td className='py-1 font-mono'>{line.product}</td>
                <td className='py-1 text-right font-mono font-bold'>{line.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>,
    document.body
  )
}
