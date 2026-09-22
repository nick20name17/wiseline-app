import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import { cn } from 'cn'
import { useState } from 'react'
import { dayStripQuery } from '../api'
import { fromIsoDay, toIsoDay, today } from '../lib/format'

type ScheduleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  actionLabel: string
  departmentId: number | undefined
  isPending: boolean
  onPick: (productionDate: string) => void
}

const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

/**
 * The month grid every scheduling decision goes through.
 *
 * Each day carries the day's budget — bends already scheduled against the department's daily capacity —
 * because the question is never «which date» on its own, it is «which date has room». Past days are
 * closed; a day the shop is shut is refused by the server, which owns the Work Days setting.
 */
export const ScheduleDialog = ({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  departmentId,
  isPending,
  onPick
}: ScheduleDialogProps) => {
  const [month, setMonth] = useState(() => firstOfMonth(new Date()))
  const [selected, setSelected] = useState<Date | undefined>(undefined)

  const { data: strip } = useQuery(
    dayStripQuery(departmentId, toIsoDay(firstOfMonth(month)), daysInMonth(month))
  )
  const budgets = new Map(strip?.map(entry => [entry.date, entry]))
  const startOfToday = fromIsoDay(today())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Calendar
          mode='single'
          // Fixed layout: each day cell takes a seventh of the width whatever its budget reads, so a
          // four-digit figure cannot stretch its column and push the grid out of shape.
          className='w-full [&_table]:w-full [&_table]:table-fixed'
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={setSelected}
          disabled={{ before: startOfToday }}
          components={{
            // A plain button, not the shared one: the cell carries two lines — the date and the
            // day's bend budget — which no button size describes.
            DayButton: ({ day, modifiers, className, children, ...props }) => {
              const budget = budgets.get(toIsoDay(day.date))

              return (
                <button
                  type='button'
                  data-day={day.date.toLocaleDateString()}
                  className={cn(
                    'flex min-h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md text-sm leading-none transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40',
                    modifiers.selected && 'bg-primary text-primary-foreground hover:bg-primary',
                    className
                  )}
                  {...props}
                >
                  {children}
                  <span
                    className={cn(
                      'w-full truncate text-center font-mono text-xs tracking-tighter',
                      modifiers.selected ? 'text-primary-foreground' : 'text-muted-foreground',
                      budget?.over_capacity && !modifiers.selected && 'text-destructive'
                    )}
                  >
                    {budget ? `${budget.bends}/${budget.capacity ?? '—'}` : ''}
                  </span>
                </button>
              )
            }
          }}
        />

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || isPending}
            onClick={() => selected && onPick(toIsoDay(selected))}
          >
            {isPending ? <Spinner data-icon='inline-start' /> : null}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
