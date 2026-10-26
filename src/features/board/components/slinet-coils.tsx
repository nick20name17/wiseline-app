import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { cutlistCoilsQuery, type CutlistCoilSummary } from '../api'
import { coilName, figure } from '../lib/coils'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** «3 more coils available totaling 7,579 ft (2 in Trim and 1 in Rollforming)», as Kevin drew it. */
const availableText = (summary: CutlistCoilSummary, more: boolean) => {
  if (!summary.available) return `0 ${more ? 'more ' : ''}coils available`
  const where = [
    summary.in_trim ? `${summary.in_trim} in Trim` : null,
    summary.in_rollforming ? `${summary.in_rollforming} in Rollforming` : null,
    summary.elsewhere ? `${summary.elsewhere} in no department` : null
  ].filter(Boolean)
  const at = summary.locations.map(({ location, coils }) => `${location} (${coils})`)
  return [
    `${plural(summary.available, `${more ? 'more ' : ''}coil`)} available totaling ${figure(summary.linear_feet)} ft`,
    where.length ? ` (${where.join(' and ')})` : '',
    at.length ? ` · at ${at.join(', ')}` : ''
  ].join('')
}

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
        <li key={coil.id} className='rounded-md bg-success/10 px-2 py-0.5 font-medium text-success'>
          Coil # {coilName(coil)} is in the machine ({figure(coil.linear_feet)} ft)
        </li>
      ))}
      {summary ? (
        <li className='rounded-md bg-muted px-2 py-0.5 text-muted-foreground'>
          {availableText(summary, coils.length > 0)}
        </li>
      ) : coils.length ? null : (
        <li className='rounded-md bg-muted px-2 py-0.5 text-muted-foreground'>
          No coil of this colour and gauge in the Slinet
        </li>
      )}
    </ul>
  )
}
