import { cn } from 'cn'
import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Remanufacturing } from '../api'
import { remanOwed, remanTotal } from '../lib/wrapping'

type RemakePillProps = { done: boolean; title?: string; children: ReactNode }

/** The remake pill: orange while it is outstanding, green once the step it waits on is done. */
export const RemakePill = ({ done, title, children }: RemakePillProps) => (
  <span
    title={title}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs',
      done ? 'bg-success/10 text-success' : 'bg-caution/15 text-caution'
    )}
  >
    <RefreshCw className='size-3' />
    {children}
  </span>
)

/** A bypassed line never went through a machine, so there is nothing to remake it on (p1 (835,298)). */
export const RemanNotApplicable = () => (
  <span
    className='text-xs text-muted-foreground'
    title='Bypassed orders skip production — Remanufacture N/A'
  >
    N/A
  </span>
)

/**
 * A remake raised against a line item. Orange until the machine marks it Bent — the Slinet's recut
 * greens only the machine tab's copy, and the floor at Wrapping is still waiting on the pieces.
 */
export const RemanBadge = ({ remans }: { remans: Remanufacturing[] }) => {
  if (!remans.length) return <span className='text-muted-foreground'>—</span>

  const owed = remanOwed(remans)
  // Once nothing is owed, the green badge counts every piece ever remade on the line.
  const remade = remanTotal(remans)

  return (
    <RemakePill
      done={!owed}
      title={
        remans
          .map(reman => reman.note)
          .filter(Boolean)
          .join(' · ') || `Remanufacture${owed ? ' outstanding' : ' complete'}`
      }
    >
      {owed || remade}
    </RemakePill>
  )
}
