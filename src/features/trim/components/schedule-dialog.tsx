import { fromIsoDay, toIsoDay, today } from '@/lib/days'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useQuery } from '@tanstack/react-query'
import { getDaysInMonth, startOfMonth } from 'date-fns'
import { CalendarX } from 'lucide-react'
import { useState } from 'react'
import { dayStripQuery } from '../api'
import { CapacityCalendar } from './capacity-calendar'

type ScheduleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenChangeComplete?: (open: boolean) => void
  title: string
  description: string
  actionLabel: string
  departmentId: number | undefined
  /** Scheduling cannot reach a past day or one the shop is shut; pinning a day to look at it can. */
  anyDay?: boolean
  /** The day the calendar opens on, already picked: the part being moved, or the day being shown. */
  initialDay?: string | null
  isPending: boolean
  onPick: (productionDate: string) => void
  /** Offered only when moving a part that is already on a day. */
  onUnschedule?: () => void
}

type PickerProps = Pick<
  ScheduleDialogProps,
  'actionLabel' | 'departmentId' | 'anyDay' | 'isPending' | 'onPick' | 'onUnschedule'
> & {
  initialDay: string | null
  onCancel: () => void
}

/**
 * The window's body, mounted with the popup: a day picked and then cancelled must not still be
 * picked, and armed, the next time it opens on a different set of orders.
 */
const Picker = ({
  actionLabel,
  departmentId,
  anyDay = false,
  initialDay,
  isPending,
  onPick,
  onUnschedule,
  onCancel
}: PickerProps) => {
  const initial = initialDay ? fromIsoDay(initialDay) : undefined
  const [month, setMonth] = useState(() => initial ?? new Date())
  const [selected, setSelected] = useState(initial)
  // Gated on the same rule as the cells: a reschedule opens with the part's own day picked, and a
  // part sitting on a past or shut day would otherwise be re-committed to it without a click on a
  // closed cell. Read from the selected day's month — the calendar's own request when it is on show.
  const monthOf = selected ?? month
  const { data: selectedMonth } = useQuery(
    dayStripQuery(departmentId, toIsoDay(startOfMonth(monthOf)), getDaysInMonth(monthOf))
  )
  const selectedIso = selected ? toIsoDay(selected) : null
  const shut = selectedMonth?.find(entry => entry.date === selectedIso)?.is_work_day === false
  const canPick = !!selectedIso && (anyDay || (selectedIso >= today() && !shut))

  return (
    <>
      <CapacityCalendar
        departmentId={departmentId}
        anyDay={anyDay}
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onSelect={setSelected}
      />

      <DialogFooter>
        {onUnschedule ? (
          <Button variant='outline' className='sm:mr-auto' onClick={onUnschedule}>
            <CalendarX data-icon='inline-start' />
            Unschedule
          </Button>
        ) : null}
        <Button variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!canPick || isPending || departmentId === undefined}
          onClick={() => selected && onPick(toIsoDay(selected))}
        >
          {isPending ? <Spinner data-icon='inline-start' /> : null}
          {actionLabel}
        </Button>
      </DialogFooter>
    </>
  )
}

/**
 * The calendar every scheduling decision goes through. Past days are closed, and so are the days the
 * shop is shut, weekends and holidays alike — the server owns Work Days and refuses them too.
 */
export const ScheduleDialog = ({
  open,
  onOpenChange,
  onOpenChangeComplete,
  title,
  description,
  initialDay = null,
  ...picker
}: ScheduleDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
    {/* Wide enough that a day's «1000 / 6000» budget fits its cell whole. */}
    <DialogContent className='sm:max-w-xl'>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <Picker {...picker} initialDay={initialDay} onCancel={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
)
