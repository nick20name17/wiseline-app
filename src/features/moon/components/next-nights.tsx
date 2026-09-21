import { MoonDisc } from './moon-disc'
import { getMoonPhase } from '../lib/moon'
import { addDays } from 'date-fns'

interface NextNightsProps {
  from: Date
  count: number
}

export const NextNights = ({ from, count }: NextNightsProps) => {
  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-xs tracking-widest text-muted-foreground uppercase'>
        Next {count} nights
      </h2>
      <ul className='grid grid-cols-7 gap-3'>
        {Array.from({ length: count }, (_, offset) => {
          // addDays, not raw ms: a DST boundary would otherwise repeat or skip a calendar day.
          const day = addDays(from, offset + 1)
          return (
            <li key={day.toISOString()} className='flex flex-col items-center gap-1.5'>
              <MoonDisc phase={getMoonPhase(day).phase} className='size-8' />
              <span className='text-xs text-muted-foreground'>{day.getDate()}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
