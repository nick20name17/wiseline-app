import { cn } from 'cn'
import { RefreshCw } from 'lucide-react'
import type { Remanufacturing } from '../api'

/**
 * A remake outstanding against a line item. Orange until the material moves — the badge turns green
 * once the Slinet has cut it, which is the point the floor stops waiting on it.
 */
export const RemanBadge = ({ remans }: { remans: Remanufacturing[] }) => {
  if (!remans.length) return <span className='text-muted-foreground'>—</span>

  const quantity = remans.reduce((total, reman) => total + (reman.remanufacturing_qty ?? 0), 0)
  const moving = remans.every(reman => reman.is_cut || reman.is_bent)

  return (
    <span
      title={
        remans
          .map(reman => reman.note)
          .filter(Boolean)
          .join(' · ') || 'Remanufacture'
      }
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-xs',
        moving ? 'bg-success/10 text-success' : 'bg-caution/15 text-caution'
      )}
    >
      <RefreshCw className='size-3' />
      {quantity}
    </span>
  )
}
