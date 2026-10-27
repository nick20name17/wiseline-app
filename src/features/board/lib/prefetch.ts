import { departmentByCode, departmentRole } from '@/lib/departments'
import type { QueryClient } from '@tanstack/react-query'
import {
  countsQuery,
  departmentRoleQuery,
  departmentsQuery,
  machinesQuery,
  scheduledOrdersQuery,
  unscheduledOrdersQuery
} from '../api'
import { BOARDS, type BoardCode } from './boards'
import type { BoardSearch } from './search'

type PrefetchBoardInput = BoardSearch & {
  code: BoardCode
  userId: number | undefined
  userRole: string
}

/**
 * What a board asks for first, started from the route instead of from the components: on a hovered
 * link, and alongside the page's code rather than after it has rendered. Left to the components, the
 * department, the role and then the lists went out one after another.
 *
 * The lists still wait on the role, as the gate does, so nothing is asked for on behalf of somebody
 * the board will turn away. A failure is left for the page's own queries to show.
 */
export const prefetchBoard = async (
  client: QueryClient,
  { code, userId, userRole, view, search }: PrefetchBoardInput
) => {
  if (userId === undefined) return
  const board = BOARDS[code]
  try {
    const department = departmentByCode(await client.ensureQueryData(departmentsQuery), code)
    if (!department) return
    const assigned = await client.ensureQueryData(departmentRoleQuery(userId, department.id))
    if (!departmentRole(userRole, assigned)) return

    await Promise.all([
      client.prefetchQuery(countsQuery(department.id)),
      board.machineTabs ? client.prefetchQuery(machinesQuery(board.name, department.id)) : null,
      view === 'unscheduled'
        ? client.prefetchQuery(unscheduledOrdersQuery(board.name, search))
        : view === 'scheduled'
          ? client.prefetchQuery(scheduledOrdersQuery(board.name, search))
          : null
    ])
  } catch {
    // The page asks again, and says what went wrong.
  }
}
