import { QueryError } from '@/components/query-error'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { departmentRole } from '@/lib/departments'
import { useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import type { ComponentProps } from 'react'
import { departmentRoleQuery, useBoardDepartment } from '../api'
import { BOARDS, type BoardCode } from '../lib/boards'
import { BoardContext, ViewOnlyContext } from '../lib/board-context'
import { BoardPage } from './board-page'

type BoardGateProps = Omit<ComponentProps<typeof BoardPage>, 'departmentId' | 'role'> & {
  /** Whose board this is. */
  code: BoardCode
  /** The viewer's global role and id. They come from the route, the layer allowed to reach auth. */
  userRole: string
  userId: number | undefined
}

const NoAccess = ({ title, description }: { title: string; description: string }) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant='icon'>
        <Lock />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </EmptyHeader>
  </Empty>
)

/**
 * Who gets a department's board, and as what. The board itself only mounts once the role is settled,
 * so nothing on it is asked for — or drawn — for a role that turns out to be different, or none.
 */
export const BoardGate = ({ code, userRole, userId, ...page }: BoardGateProps) => {
  const board = BOARDS[code]
  const { data: department, isPending: findingDepartment } = useBoardDepartment(code)
  const assignment = useQuery(departmentRoleQuery(userId, department?.id))
  const role = departmentRole(userRole, assignment.data ?? null)

  if (department && (role === 'manager' || role === 'worker' || role === 'viewer'))
    return (
      <BoardContext value={board}>
        <ViewOnlyContext value={role === 'viewer'}>
          <BoardPage {...page} departmentId={department.id} role={role} />
        </ViewOnlyContext>
      </BoardContext>
    )

  // A disabled query stays pending, so «still deciding» is asked of the step actually running.
  if (findingDepartment || (department && assignment.isPending))
    return <Skeleton className='h-64' />
  if (!department)
    return (
      <NoAccess
        title={`No ${board.name} department`}
        description={`The ${board.name} department is not set up in Settings.`}
      />
    )
  if (assignment.isError)
    return (
      <QueryError
        title={`Your role in ${board.name} did not load`}
        error={assignment.error}
        onRetry={() => void assignment.refetch()}
      />
    )
  return (
    <NoAccess
      title={`Not assigned to ${board.name}`}
      description={`Ask an admin to add you to the ${board.name} department as a Manager or a Worker.`}
    />
  )
}
