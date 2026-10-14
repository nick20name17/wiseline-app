import { Button } from '@/components/ui/button'
import { cn } from 'cn'
import { ClipboardPaste, Copy, Pencil } from 'lucide-react'
import type { BoardLineItem, CoilEntry, UnitCoil, WrappingRow } from '../api'
import { useViewOnly } from '../lib/board-context'
import { coilSummary, fillEntries, hasCoil, unitCoils } from '../lib/unit-coils'
import { lineName } from '../lib/wrapping'
import { CoilLock } from './coil-lock'

export type CoilItem = NonNullable<BoardLineItem['item']>

/** A Supplier and Coil Number taken off one line to paste into another. */
export type CopiedCoil = { supplier: string; coilNumber: string }

type CoilCellProps = {
  row: WrappingRow
  item: CoilItem | undefined
  copied: CopiedCoil | null
  pasting: boolean
  /** The units still without a coil on a line split by coil; null for the line itself. */
  onFill: (units: UnitCoil[] | null) => void
  onCopy: (coil: CopiedCoil) => void
  onPaste: (entries: CoilEntry[]) => void
}

const fits = (coil: Omit<UnitCoil, 'unit'>, copied: CopiedCoil) =>
  !(coil.supplier_locked && coil.supplier !== copied.supplier) &&
  !(coil.coil_number_locked && coil.coil_number !== copied.coilNumber)

/**
 * A line's coil at the machine. What the Manager or the Slit Line set is locked p2 (1010,333); what
 * they left Undefined the Worker fills in before packing p2 (1010,346) — chosen, typed, or pasted
 * from another line with the copy button p2 (1040,347).
 */
export const CoilCell = ({
  row,
  item,
  copied,
  pasting,
  onFill,
  onCopy,
  onPaste
}: CoilCellProps) => {
  const viewOnly = useViewOnly()
  // A Stock line rolls off nothing p2 (1010,337).
  if (!item || row.status === 'stock') return <span className='text-muted-foreground'>—</span>

  const waiting = item.coil_icon === 'waiting_to_slit'
  // A line whose units roll off coils of their own p2 (679,416) is filled in unit by unit: the ones
  // still without a coil.
  const units = item.unit_coils.length ? unitCoils(item, row.qty_ordered) : null
  const missing = units?.filter(coil => !hasCoil(coil)) ?? null
  const summary = units ? coilSummary(units) : null
  // A split line with every unit filled in has nothing left to fill, which is not the same as locked.
  const done = missing?.length === 0
  const locked =
    waiting ||
    (missing
      ? !done && missing.every(coil => coil.supplier_locked && coil.coil_number_locked)
      : item.supplier_locked && item.coil_number_locked)
  const own =
    !units && item.supplier && item.coil_number
      ? { supplier: item.supplier, coilNumber: item.coil_number }
      : null
  const text = waiting
    ? 'waiting...'
    : summary
      ? summary.length === 1
        ? summary[0]!
        : `${summary.length} coils`
      : `${item.supplier ?? 'Undefined'} / ${item.coil_number ?? 'Undefined'}`
  // A paste may not change what is locked, and pasting a line's own coil changes nothing.
  const pastable =
    !!copied &&
    (missing
      ? !!missing.length && missing.every(coil => fits(coil, copied))
      : fits(item, copied) &&
        !(own?.supplier === copied.supplier && own.coilNumber === copied.coilNumber))
  const choice = copied && { supplier: copied.supplier, coilNumber: copied.coilNumber }

  return (
    <span className='flex min-w-0 items-center gap-1'>
      <span
        className={cn(
          'truncate font-mono text-xs',
          (missing ? missing.length : !own) && !waiting && 'text-warning'
        )}
        title={summary?.join('\n') ?? text}
      >
        {text}
      </span>
      <CoilLock locked={locked} />
      {viewOnly ? null : (
        <span className='ml-auto flex shrink-0'>
          {locked || done ? null : (
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label={`Supplier and Coil Number for ${lineName(row)}`}
              title='Choose the Supplier and Coil Number'
              onClick={() => onFill(missing)}
            >
              <Pencil />
            </Button>
          )}
          {own ? (
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label={`Copy ${own.coilNumber} from ${lineName(row)}`}
              title='Copy the Coil Number'
              onClick={() => {
                onCopy(own)
                // Also on the clipboard, for typing it in by hand; the paste button needs neither.
                void navigator.clipboard?.writeText(own.coilNumber).catch(() => undefined)
              }}
            >
              <Copy />
            </Button>
          ) : null}
          {pastable ? (
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label={`Paste ${copied.coilNumber} into ${lineName(row)}`}
              title={`Paste ${copied.supplier} / ${copied.coilNumber}`}
              disabled={pasting}
              onClick={() => choice && onPaste(fillEntries(row.origin_item, missing, choice))}
            >
              <ClipboardPaste />
            </Button>
          ) : null}
        </span>
      )}
    </span>
  )
}
