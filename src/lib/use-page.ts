import { useState } from 'react'

/** The last page of `count` rows, zero-based, which is the first when there are none. */
export const lastPage = (count: number, pageSize: number) =>
  Math.max(0, Math.ceil(count / pageSize) - 1)

/**
 * The page of a server list being read, zero-based. It goes back to the first when `scope` (the
 * list's filter) changes.
 */
export const usePage = (scope: string) => {
  const [state, setState] = useState({ scope, page: 0 })
  const page = state.scope === scope ? state.page : 0
  return [page, (next: number) => setState({ scope, page: next })] as const
}
