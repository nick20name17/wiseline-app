import { DepartmentPills } from '@/components/department-pills'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { departmentByCode, departmentRole, inBoardOrder } from '@/lib/departments'
import { useQuery } from '@tanstack/react-query'
import { Flag } from 'lucide-react'
import { departmentRoleQuery, departmentsQuery, prioritiesQuery, type Priority } from '../api'
import { PrioritiesTable } from './priorities-table'
import { CreatePriorityDialog } from './priority-dialog'

type PrioritiesPageProps = {
  department: string | undefined
  onDepartmentChange: (department: string | undefined) => void
  /** The viewer's global role and id. They come from the route, the layer allowed to reach auth. */
  userRole: string
  userId: number | undefined
}

/**
 * The priorities each department's board sorts by, one department at a time: the row order is its
 * hierarchy and the rows are dragged to change it.
 */
export const PrioritiesPage = ({
  department,
  onDepartmentChange,
  userRole,
  userId
}: PrioritiesPageProps) => {
  const { data: departments, isPending: departmentsPending } = useQuery(departmentsQuery)
  const ordered = inBoardOrder(departments)
  const active = departmentByCode(ordered, department) ?? ordered[0]
  // «Only the Manager can set Priorities» p1 (241,403): a department's own by its Manager, and the
  // ones every department shares by a Manager at all. Anyone else reads.
  const { data: assigned = null } = useQuery(departmentRoleQuery(userId, active?.id))
  const managesShared = departmentRole(userRole, null) === 'manager' || userRole === 'manager'
  const managesOwn = departmentRole(userRole, assigned) === 'manager'
  const canChange = (priority: Priority) =>
    priority.department === null ? managesShared : managesOwn

  const { data: priorities = [], isPending: prioritiesPending } = useQuery(
    prioritiesQuery(active?.id)
  )
  const isPending = departmentsPending || (active !== undefined && prioritiesPending)

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <DepartmentPills
        departments={ordered}
        active={active}
        onChange={onDepartmentChange}
        all={false}
      />

      <div className='flex items-center gap-3.5 max-md:flex-wrap'>
        {active && priorities.length ? (
          <p className='text-sm text-muted-foreground'>
            <span className='font-semibold text-foreground'>{priorities.length}</span>{' '}
            {priorities.length === 1 ? 'priority' : 'priorities'} in {active.name}
            <span className='text-xs'>
              {managesOwn ? ' · drag the rows to reorder' : ' · only a Manager changes them'}
            </span>
          </p>
        ) : null}

        {/* Stays on the right with or without the count before it. */}
        {active && managesOwn ? (
          <div className='ml-auto'>
            <CreatePriorityDialog departmentId={active.id} />
          </div>
        ) : null}
      </div>

      {!isPending && !priorities.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Flag />
            </EmptyMedia>
            <EmptyTitle>No priorities yet</EmptyTitle>
            <EmptyDescription>
              {active && managesOwn
                ? `Add one to get started for ${active.name}.`
                : 'A Manager adds them.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <PrioritiesTable
          priorities={priorities}
          departmentId={active?.id ?? 0}
          isPending={isPending}
          canChange={canChange}
        />
      )}
    </section>
  )
}
