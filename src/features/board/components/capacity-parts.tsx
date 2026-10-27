import { cn } from 'cn'
import type { CSSProperties, ReactNode } from 'react'
import { formatCount as count, share } from '../lib/format'

// The parts the capacity report is built of, shared with the strips that show a day's load where it
// is worked: the Scheduled tab as machines are assigned, a station's own Production tab.

/** A column's name ruled underneath, as the paper report has them. */
export const Heading = ({ children }: { children: ReactNode }) => (
  <span className='mb-1 block border-b border-foreground pb-0.5 text-center text-sm font-bold'>
    {children}
  </span>
)

type CapProps = {
  /** Names the day or the Slinet above its ceiling; a machine's name is its label. */
  heading?: ReactNode
  label: ReactNode
  cap: number | null | undefined
  used: number
  /** Over `cap`: the server's verdict. */
  over?: boolean
}

/**
 * A ceiling, how full the day has it and the bar that shows it — the left half of every card.
 *
 * The bar is clamped, the percent is not: 120% over a full bar is the warning, a bar running off the
 * card would only be noise.
 */
export const Cap = ({ heading, label, cap, used, over = false }: CapProps) => {
  const percent = share(used, cap)
  return (
    <div className='flex flex-col gap-1.5'>
      {heading ? <Heading>{heading}</Heading> : null}
      <div className='flex items-baseline gap-3 text-sm max-sm:flex-wrap max-sm:gap-x-2 max-sm:gap-y-0.5'>
        <span className='min-w-0 flex-1 truncate max-sm:basis-full'>{label}</span>
        <span className={cn('font-mono', over && 'text-destructive')}>
          {cap ? count(cap) : 'N/A'}
        </span>
        <span className={cn('w-11 text-right font-mono font-bold', over && 'text-destructive')}>
          {percent === null ? 'N/A' : `${percent}%`}
        </span>
      </div>
      <Bar percent={percent} over={over} />
    </div>
  )
}

/** The blue the day pills fill with, red once the day is over its max. */
export const Bar = ({ percent, over }: { percent: number | null; over: boolean }) => (
  <span className='block h-2 w-full overflow-hidden rounded-full border border-input bg-muted'>
    <span
      className={cn('block h-full w-(--used)', over ? 'bg-destructive' : 'bg-primary')}
      style={{ '--used': `${Math.min(percent ?? 0, 100)}%` } as CSSProperties}
    />
  </span>
)

type FigureProps = {
  value: number
  /** Part of the value beside it, never an addition to it. */
  fromStock?: number
  /** The day still has work with no machine, which is what the gap below this card is. */
  unrouted?: boolean
}

type ProgressProps = FigureProps & {
  done: number
  /** How much of `fromStock` is done. */
  fromStockDone: number
}

/**
 * How much of a total the floor has done — `done / total`, the percent and its bar — with the same
 * for its Stock Orders underneath, in the small blue line.
 */
export const Progress = ({
  done,
  value,
  fromStock = 0,
  fromStockDone,
  unrouted
}: ProgressProps) => {
  const percent = share(done, value)
  const stockPercent = share(fromStockDone, fromStock)
  return (
    <span className='flex flex-col items-center gap-1 font-mono'>
      <span className='flex items-baseline gap-2 text-sm max-sm:flex-col max-sm:items-center max-sm:gap-0'>
        <span className={cn(unrouted && 'text-warning')}>
          {count(done)} / {count(value)}
        </span>
        {percent === null ? null : <span className='font-bold'>{percent}%</span>}
      </span>
      <Bar percent={percent} over={false} />
      {fromStock ? (
        <span className='text-xs whitespace-nowrap text-primary max-sm:whitespace-normal'>
          {count(fromStockDone)} / {count(fromStock)}
          {stockPercent === null ? null : ` ${stockPercent}%`}
        </span>
      ) : null}
    </span>
  )
}
