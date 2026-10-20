import { useQuery } from '@tanstack/react-query'
import { dayLoadQuery, type DayLoad } from '../api'

const UNITS: Record<DayLoad['unit'], string> = {
  bends: 'bends',
  linear_feet: 'ft',
  pieces: 'pcs'
}

/** Said before a day is closed with work already on it, which then stays on a day nobody works. */
export const DayLoadWarning = ({ date }: { date: string }) => {
  const { data: loads } = useQuery(dayLoadQuery(date))
  if (!loads?.length) return null

  return (
    <p className='mt-4 text-sm text-destructive'>
      Already scheduled on this day:{' '}
      {loads
        .map(
          load =>
            `${Math.round(load.used).toLocaleString()} ${UNITS[load.unit]} in ${load.department}`
        )
        .join(', ')}
      . Closing it leaves that work there until it is rescheduled.
    </p>
  )
}
