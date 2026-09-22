import { Fact } from '@/components/fact'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { MoonDisc } from './moon-disc'
import { NextNights } from './next-nights'
import { formatDay, getMoonPhase, parseDayParam, toDayParam } from '../lib/moon'
import { addDays } from 'date-fns'

const NIGHTS_AHEAD = 14

type MoonPageProps = {
  dateParam: string | undefined
  onDateChange: (dateParam: string | undefined) => void
}

export const MoonPage = ({ dateParam, onDateChange }: MoonPageProps) => {
  const date = (dateParam === undefined ? undefined : parseDayParam(dateParam)) ?? new Date()
  const setDate = (next: Date) => onDateChange(toDayParam(next))
  const shiftDays = (days: number) => setDate(addDays(date, days))
  const moon = getMoonPhase(date)

  return (
    <div className='flex flex-col gap-8'>
      <header className='flex flex-col gap-2'>
        <h1 className='font-heading text-3xl font-semibold tracking-tight'>Moon phase</h1>
        <p className='text-muted-foreground'>
          Pick any date and see how the Moon looks that night.
        </p>
      </header>

      <div className='flex flex-wrap items-end gap-3'>
        <div className='flex flex-col gap-1.5'>
          <span className='text-xs tracking-widest text-muted-foreground uppercase'>Date</span>
          <DatePicker value={date} onChange={setDate} format={formatDay} className='w-48' />
        </div>
        <Button variant='outline' onClick={() => shiftDays(-1)}>
          − 1 day
        </Button>
        <Button variant='outline' onClick={() => shiftDays(1)}>
          + 1 day
        </Button>
        <Button variant='ghost' onClick={() => onDateChange(undefined)}>
          Today
        </Button>
      </div>

      <section className='flex flex-wrap items-center gap-8 border border-border p-8'>
        <MoonDisc phase={moon.phase} className='size-40 shrink-0' />
        <dl className='grid flex-1 grid-cols-2 gap-x-8 gap-y-4 text-sm'>
          <Fact label='Phase' value={moon.name} />
          <Fact label='Illumination' value={`${Math.round(moon.illumination * 100)}%`} />
          <Fact label='Age' value={`${moon.ageDays.toFixed(1)} days`} />
          <Fact label='Date' value={formatDay(date)} />
          <Fact label='Next new moon' value={formatDay(moon.nextNewMoon)} />
          <Fact label='Next full moon' value={formatDay(moon.nextFullMoon)} />
        </dl>
      </section>

      <NextNights from={date} count={NIGHTS_AHEAD} />
    </div>
  )
}
