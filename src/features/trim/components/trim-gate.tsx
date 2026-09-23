import { QueryError } from '@/components/query-error'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { departmentRole } from '@/lib/departments'
import { useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import type { ComponentProps } from 'react'
import { departmentRoleQuery, useTrimDepartment } from '../api'
import { TrimPage } from './trim-page'

type TrimGateProps = Omit<ComponentProps<typeof TrimPage>, 'departmentId' | 'role'> & {
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
 * Who gets the Trim board, and as what. The board itself only mounts once the role is settled, so
 * nothing on it is asked for — or drawn — for a role that turns out to be different, or none.
 */
export const TrimGate = ({ userRole, userId, ...page }: TrimGateProps) => {
  const { data: department, isPending: findingDepartment } = useTrimDepartment()
  const assignment = useQuery(departmentRoleQuery(userId, department?.id))
  const role = departmentRole(userRole, assignment.data ?? null)

  if (department && (role === 'manager' || role === 'worker'))
    return <TrimPage {...page} departmentId={department.id} role={role} />

  // A disabled query stays pending, so «still deciding» is asked of the step actually running.
  if (findingDepartment || (department && assignment.isPending))
    return <Skeleton className='h-64' />
  if (!department)
    return (
      <NoAccess
        title='No Trim department'
        description='The Trim department is not set up in Settings.'
      />
    )
  if (assignment.isError)
    return (
      <QueryError
        title='Your role in Trim did not load'
        error={assignment.error}
        onRetry={() => void assignment.refetch()}
      />
    )
  return (
    <NoAccess
      title='Not assigned to Trim'
      description='Ask an admin to add you to the Trim department as a Manager or a Worker.'
    />
  )
}
