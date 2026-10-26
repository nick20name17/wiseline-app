import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { cutlistCoilsQuery } from '../api'
import { coilName, figure } from '../lib/coils'

/**
 * The coils already in the Slinet that a cutlist can be cut from, read off its card so the next
 * coil is loaded while the current list is cut (call of 2026-10-26, Kevin's mockup).
 */
export const SlinetCoils = ({ cutlistId }: { cutlistId: number }) => {
  const { data: coils, isPending, isError } = useQuery(cutlistCoilsQuery(cutlistId))

  if (isPending) return <Skeleton className='mx-3 mb-2 h-6 w-64' />
  // The Cutlist Coils button says the same thing at length; a failed read here is not worth a banner.
  if (isError) return null

  return (
    <ul aria-label='Coils in the Slinet' className='flex flex-wrap gap-2 px-3 pb-2 text-xs'>
      {coils.length ? (
        coils.map(coil => (
          <li
            key={coil.id}
            className='rounded-md bg-success/10 px-2 py-0.5 font-medium text-success'
          >
            Coil # {coilName(coil)} is in the machine ({figure(coil.linear_feet)} ft)
          </li>
        ))
      ) : (
        <li className='rounded-md bg-muted px-2 py-0.5 text-muted-foreground'>
          No coil of this colour and gauge in the Slinet
        </li>
      )}
    </ul>
  )
}
