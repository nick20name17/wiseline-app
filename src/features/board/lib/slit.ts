import { useQueries } from '@tanstack/react-query'
import { slitLineQuery, type SlitLine } from '../api'

/** Every line the department sent to the Slit Line, waiting or slit, by line. */
export const useSlitStates = (departmentId: number | undefined, enabled: boolean) => {
  const [waiting, done] = useQueries({
    queries: [false, true].map(slit => ({ ...slitLineQuery(departmentId, slit), enabled }))
  })
  return new Map<string, SlitLine>(
    [...(waiting?.data ?? []), ...(done?.data ?? [])].map(line => [line.origin_item, line])
  )
}
