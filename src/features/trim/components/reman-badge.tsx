import { cn } from 'cn'
import { RefreshCw } from 'lucide-react'
import type { Remanufacturing } from '../api'
import { remanOwed, remanTotal } from '../lib/wrapping'

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
    <span
      title={
        remans
          .map(reman => reman.note)
          .filter(Boolean)
          .join(' · ') || `Remanufacture${owed ? ' outstanding' : ' complete'}`
      }
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-xs',
        owed ? 'bg-caution/15 text-caution' : 'bg-success/10 text-success'
      )}
    >
      <RefreshCw className='size-3' />
      {owed || remade}
    </span>
  )
}
