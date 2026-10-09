import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/query-error'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { today } from '@/lib/days'
import { useQuery } from '@tanstack/react-query'
import { CalendarOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { holidaysQuery } from '../api'
import { CreateHolidayDialog } from './holiday-dialog'
import { HolidaysTable } from './holidays-table'

type WorkDaysPageProps = {
  /** `undefined` is this year. */
  year: number | undefined
  onYearChange: (year: number) => void
}

/**
 * The shop's holidays, one year at a time — a yearly holiday is entered again for each year. They close
 * the day for every department: scheduling refuses them and the day strips step over them.
 */
export const WorkDaysPage = ({ year: asked, onYearChange }: WorkDaysPageProps) => {
  const thisYear = Number(today().slice(0, 4))
  const year = asked ?? thisYear
  const { data: holidays, isPending, isError, error, refetch } = useQuery(holidaysQuery(year))
  const initialDate = year === thisYear ? today() : `${year}-01-01`
  const onSaved = (date: string) => onYearChange(Number(date.slice(0, 4)))

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between gap-3.5'>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            aria-label='Previous year'
            onClick={() => onYearChange(year - 1)}
          >
            <ChevronLeft />
          </Button>
          <h2 className='min-w-14 text-center font-heading text-lg font-semibold tabular-nums'>
            {year}
          </h2>
          <Button
            variant='outline'
            size='icon'
            aria-label='Next year'
            onClick={() => onYearChange(year + 1)}
          >
            <ChevronRight />
          </Button>
          {year === thisYear ? null : (
            <Button variant='outline' onClick={() => onYearChange(thisYear)}>
              This year
            </Button>
          )}
          {holidays?.length ? (
            <p className='ml-1 text-sm text-muted-foreground'>
              {holidays.length} {holidays.length === 1 ? 'holiday' : 'holidays'}
            </p>
          ) : null}
        </div>

        <CreateHolidayDialog initialDate={initialDate} onSaved={onSaved} />
      </div>

      {isError && !holidays ? (
        <QueryError
          title={`The holidays of ${year} did not load`}
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && !holidays?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <CalendarOff />
            </EmptyMedia>
            <EmptyTitle>No holidays in {year}</EmptyTitle>
            <EmptyDescription>
              Add the days the shop is closed. Nothing can be scheduled onto them.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <HolidaysTable holidays={holidays ?? []} isPending={isPending} onSaved={onSaved} />
      )}
    </section>
  )
}
