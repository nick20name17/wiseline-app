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
import { useState } from 'react'
import { toIsoDay } from '../lib/format'
import { CapacityCalendar } from './capacity-calendar'

type ScheduleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  actionLabel: string
  departmentId: number | undefined
  /** Scheduling cannot reach into the past; pinning a day to look at it can. */
  allowPast?: boolean
  isPending: boolean
  onPick: (productionDate: string) => void
}

/**
 * The calendar every scheduling decision goes through. Past days are closed; a day the shop is shut is
 * refused by the server, which owns the Work Days setting.
 */
export const ScheduleDialog = ({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  departmentId,
  allowPast = false,
  isPending,
  onPick
}: ScheduleDialogProps) => {
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<Date | undefined>(undefined)

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        // The dialog stays mounted between openings, so a day picked and then cancelled would still be
        // picked — and armed — the next time it opens, on a different set of orders.
        if (next) {
          setSelected(undefined)
          setMonth(new Date())
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <CapacityCalendar
          departmentId={departmentId}
          enabled={open}
          allowPast={allowPast}
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={setSelected}
        />

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || isPending || departmentId === undefined}
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
