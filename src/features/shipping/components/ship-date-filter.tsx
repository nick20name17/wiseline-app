import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate, fromIsoDay, toIsoDay } from '@/lib/days'
import { CalendarIcon, X } from 'lucide-react'

export type ShipDates = { shipFrom?: string; shipTo?: string }

type ShipDateFilterProps = ShipDates & { onChange: (next: ShipDates) => void }

const labelOf = ({ shipFrom, shipTo }: ShipDates) => {
  if (shipFrom && shipTo)
    return shipFrom === shipTo
      ? `Ship ${formatDate(shipFrom)}`
      : `Ship ${formatDate(shipFrom)} – ${formatDate(shipTo)}`
  if (shipFrom) return `Ship from ${formatDate(shipFrom)}`
  if (shipTo) return `Ship by ${formatDate(shipTo)}`
  return 'Any ship date'
}

/** Unscheduled narrowed to EBMS ship dates, both ends included (round 10, C2). */
export const ShipDateFilter = ({ shipFrom, shipTo, onChange }: ShipDateFilterProps) => (
  <div className='flex items-center gap-1'>
    <Popover>
      <PopoverTrigger render={<Button variant='outline' />}>
        <CalendarIcon data-icon='inline-start' />
        {labelOf({ shipFrom, shipTo })}
      </PopoverTrigger>
      <PopoverContent align='start' className='w-auto'>
        <Calendar
          mode='range'
          captionLayout='dropdown'
          selected={{
            from: shipFrom ? fromIsoDay(shipFrom) : undefined,
            to: shipTo ? fromIsoDay(shipTo) : undefined
          }}
          defaultMonth={shipFrom ? fromIsoDay(shipFrom) : undefined}
          onSelect={range =>
            onChange({
              shipFrom: range?.from && toIsoDay(range.from),
              shipTo: range?.to && toIsoDay(range.to)
            })
          }
        />
      </PopoverContent>
    </Popover>
    {shipFrom || shipTo ? (
      <Button
        variant='ghost'
        size='icon'
        aria-label='Clear the ship date filter'
        onClick={() => onChange({ shipFrom: undefined, shipTo: undefined })}
      >
        <X />
      </Button>
    ) : null}
  </div>
)
