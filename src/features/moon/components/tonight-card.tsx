import { buttonVariants } from '@/components/ui/button'
import { MoonDisc } from './moon-disc'
import { getMoonPhase } from '../lib/moon'
import { Link } from '@tanstack/react-router'

export const TonightCard = ({ date }: { date: Date }) => {
  const moon = getMoonPhase(date)

  return (
    <section className='flex items-center gap-6 border border-border p-6'>
      <MoonDisc phase={moon.phase} className='size-24 shrink-0' />
      <div className='flex flex-col gap-2'>
        <p className='text-xs tracking-widest text-muted-foreground uppercase'>Tonight</p>
        <p className='font-heading text-xl font-semibold'>{moon.name}</p>
        <p className='text-sm text-muted-foreground'>
          {Math.round(moon.illumination * 100)}% lit · day {moon.ageDays.toFixed(1)} of the cycle
        </p>
        <Link to='/moon' className={buttonVariants({ size: 'sm', className: 'mt-2 self-start' })}>
          Pick a date
        </Link>
      </div>
    </section>
  )
}
