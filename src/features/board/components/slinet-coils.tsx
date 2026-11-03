import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { cutlistCoilsQuery, type CutlistCoilSummary } from '../api'
import { coilName, figure } from '../lib/coils'

// Whole feet: a Slinet operator weighs coils by the hundred, not by the thousandth.
const feet = (value: number | null) => `${value === null ? '—' : figure(Math.round(value))} ft`

/**
 * «5 - (47,477 ft) 3 - Trim, 1 - Rollforming, 1 - No Department», as Kevin's notes of 2026-11-02 (A10)
 * write it: how many more could go on, then where they are. No locations: the example drops them.
 */
const availableText = (summary: CutlistCoilSummary) =>
  [
    `${summary.available} - (${feet(summary.linear_feet)})`,
    [
      summary.in_trim ? `${summary.in_trim} - Trim` : null,
      summary.in_rollforming ? `${summary.in_rollforming} - Rollforming` : null,
      summary.elsewhere ? `${summary.elsewhere} - No Department` : null
    ]
      .filter(Boolean)
      .join(', ')
  ]
    .filter(Boolean)
    .join(' ')

type SlinetCoilsProps = {
  cutlistId: number
  /** Missing until the day's summaries are in, or when they did not load. */
  summary: CutlistCoilSummary | undefined
}

/**
 * The coils a Slinet list can be cut from: those already in the machine, then how many more could be
 * loaded and from where — so the next coil goes on while the current list is cut (call of 2026-10-26).
 */
export const SlinetCoils = ({ cutlistId, summary }: SlinetCoilsProps) => {
  const { data: coils, isPending, isError } = useQuery(cutlistCoilsQuery(cutlistId))

  if (isPending) return <Skeleton className='mx-3 mb-2 h-6 w-64' />
  // The Cutlist Coils button says the same thing at length; a failed read here is not worth a banner.
  if (isError) return null

  return (
    <ul aria-label='Coils for this cutlist' className='flex flex-wrap gap-2 px-3 pb-2 text-xs'>
      {coils.map(coil => (
        <li
          key={coil.id}
          title='In the Slinet'
          className='rounded-md bg-success/10 px-2 py-0.5 font-medium text-success'
        >
          {coilName(coil)} ({feet(coil.linear_feet)})
        </li>
      ))}
      {summary ? (
        <li
          title='More coils of this colour and gauge, and the departments holding them'
          className='rounded-md bg-muted px-2 py-0.5 text-muted-foreground'
        >
          {availableText(summary)}
        </li>
      ) : coils.length ? null : (
        <li className='rounded-md bg-muted px-2 py-0.5 text-muted-foreground'>
          No coil of this colour and gauge in the Slinet
        </li>
      )}
    </ul>
  )
}
