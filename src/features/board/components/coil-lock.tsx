import { Lock } from 'lucide-react'

/**
 * Beside a line's Supplier or Coil Number the Manager assigned, or the Slit Line owes: the floor rolls
 * off that coil as it is p2 (925,299), (1051,333).
 */
export const CoilLock = ({ locked }: { locked: boolean }) =>
  locked ? <Lock className='size-3 shrink-0 text-muted-foreground' aria-label='Locked' /> : null
