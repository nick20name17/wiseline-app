import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/query-error'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { today } from '@/lib/days'
import { useQuery } from '@tanstack/react-query'
import { CalendarOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { calendarDaysQuery, exceptionsQuery, workWeekQuery, type CalendarDay } from '../api'
import type { WorkDaysView } from '../lib/search'
import { DayDialog } from './day-dialog'
import { CreateExceptionDialog } from './exception-dialog'
import { ExceptionsTable } from './exceptions-table'
import { WorkWeek } from './work-week'
import { YearCalendar } from './year-calendar'

type WorkDaysPageProps = {
  /** `undefined` is this year. */
  year: number | undefined
  onYearChange: (year: number) => void
  /** `undefined` is the calendar. */
  view: WorkDaysView | undefined
  onViewChange: (view: WorkDaysView) => void
  /** Only an Admin sets the work week. */
  canEditWeek: boolean
  /** A Manager or an Admin sets single days; anyone else reads them. */
  canEditDays: boolean
}

/**
 * Which days the shop works: the usual week, then the dates that break it — holidays it closes on
 * though the weekday is worked, working days it opens on though it is not. Scheduling and every
 * department's day strip follow it.
 */
export const WorkDaysPage = ({
  year: asked,
  onYearChange,
  view = 'calendar',
  onViewChange,
  canEditWeek,
  canEditDays
}: WorkDaysPageProps) => {
  const thisYear = Number(today().slice(0, 4))
  const year = asked ?? thisYear
  const [picked, setPicked] = useState<CalendarDay | null>(null)

  const { data: workDays } = useQuery(workWeekQuery)
  const days = useQuery({ ...calendarDaysQuery(year), enabled: view === 'calendar' })
  const exceptions = useQuery({ ...exceptionsQuery(year), enabled: view === 'list' })
  const shown = view === 'calendar' ? days : exceptions

  const initialDate = year === thisYear ? today() : `${year}-01-01`
  const onSaved = (date: string) => onYearChange(Number(date.slice(0, 4)))
  const holidays = exceptions.data?.filter(row => row.kind === 'holiday').length ?? 0
  const workingDays = (exceptions.data?.length ?? 0) - holidays

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <WorkWeek canEdit={canEditWeek} />

      <div className='flex flex-wrap items-center justify-between gap-3.5'>
        <div className='flex flex-wrap items-center gap-2'>
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
          <Tabs value={view} onValueChange={value => onViewChange(value as WorkDaysView)}>
            <TabsList className='ml-1'>
              <TabsTrigger value='calendar'>Calendar</TabsTrigger>
              <TabsTrigger value='list'>List</TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'list' && exceptions.data?.length ? (
            <p className='ml-1 text-sm text-muted-foreground'>
              {holidays} {holidays === 1 ? 'holiday' : 'holidays'} · {workingDays}{' '}
              {workingDays === 1 ? 'working day' : 'working days'}
            </p>
          ) : null}
        </div>

        {view === 'list' && canEditDays ? (
          <CreateExceptionDialog initialDate={initialDate} onSaved={onSaved} />
        ) : view === 'calendar' && canEditDays ? (
          <p className='text-xs text-muted-foreground'>Pick a day to close or open it.</p>
        ) : null}
      </div>

      {shown.isError && !shown.data ? (
        <QueryError
          title={`The work days of ${year} did not load`}
          error={shown.error}
          onRetry={() => void shown.refetch()}
        />
      ) : view === 'calendar' ? (
        <YearCalendar days={days.data} onPick={canEditDays && workDays ? setPicked : undefined} />
      ) : !exceptions.isPending && !exceptions.data?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <CalendarOff />
            </EmptyMedia>
            <EmptyTitle>No holidays or working days in {year}</EmptyTitle>
            <EmptyDescription>
              Every day is worked or off as its weekday is. Add the days the shop closes or opens
              against the week.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ExceptionsTable
          exceptions={exceptions.data ?? []}
          isPending={exceptions.isPending}
          onSaved={canEditDays ? onSaved : undefined}
        />
      )}

      <DayDialog day={picked} workDays={workDays ?? []} onClose={() => setPicked(null)} />
    </section>
  )
}
