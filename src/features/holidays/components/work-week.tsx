import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { WEEKDAYS, useSaveWorkWeek, workWeekQuery } from '../api'

type WorkWeekProps = {
  /** Only an Admin sets the usual week; everyone else reads it. */
  canEdit: boolean
}

/**
 * The weekdays the shop usually works. Ticking Saturday makes every Saturday schedulable from then on;
 * a single Saturday shift is a working day on the calendar instead.
 */
export const WorkWeek = ({ canEdit }: WorkWeekProps) => {
  const { data: workDays } = useQuery(workWeekQuery)
  const save = useSaveWorkWeek()
  // While a change saves, the boxes show what was asked, not the week the server still answers.
  const shown = save.isPending ? save.variables : workDays

  const toggle = (day: number, on: boolean) => {
    if (!shown) return
    save.mutate(on ? [...shown, day].toSorted((a, b) => a - b) : shown.filter(d => d !== day))
  }

  return (
    <fieldset className='flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs'>
      <legend className='sr-only'>Work week</legend>
      <div className='flex items-center gap-2'>
        <h2 className='font-heading text-base font-semibold'>Work week</h2>
        {save.isPending ? <Spinner /> : null}
        <p className='text-xs text-muted-foreground'>
          {canEdit
            ? 'The days scheduling and the day strips count as worked'
            : 'Only an Admin changes the work week'}
        </p>
      </div>
      <div className='flex flex-wrap gap-x-5 gap-y-3'>
        {WEEKDAYS.map(({ day, short, long }) => {
          const checked = shown?.includes(day) ?? false
          return shown ? (
            <Label key={day} className={cn(canEdit && 'cursor-pointer')}>
              <Checkbox
                checked={checked}
                // The server refuses a week with no day in it.
                disabled={!canEdit || save.isPending || (checked && shown.length === 1)}
                onCheckedChange={on => toggle(day, on)}
                aria-label={long}
              />
              <span aria-hidden>{short}</span>
            </Label>
          ) : (
            <Skeleton key={day} className='h-5 w-14' />
          )
        })}
      </div>
    </fieldset>
  )
}
