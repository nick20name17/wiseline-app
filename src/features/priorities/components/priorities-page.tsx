import { DepartmentPills } from '@/components/department-pills'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { departmentByCode, departmentRole, inBoardOrder } from '@/lib/departments'
import { useQuery } from '@tanstack/react-query'
import { Flag } from 'lucide-react'
import { departmentRoleQuery, departmentsQuery, prioritiesQuery } from '../api'
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
 * The priorities each department's board sorts by. Under one department the row order is the
 * hierarchy and the rows are dragged to change it; under All each row names its department.
 */
export const PrioritiesPage = ({
  department,
  onDepartmentChange,
  userRole,
  userId
}: PrioritiesPageProps) => {
  const { data: departments, isPending: departmentsPending } = useQuery(departmentsQuery)
  const ordered = inBoardOrder(departments)
  const active = departmentByCode(ordered, department)
  // «Only the Manager can set Priorities» p1 (241,403): a department's list by its own Manager, the
  // ones every department shares by a Manager at all. Anyone else reads.
  const { data: assigned = null } = useQuery(departmentRoleQuery(userId, active?.id))
  const canEdit = active
    ? departmentRole(userRole, assigned) === 'manager'
    : userRole === 'manager' || departmentRole(userRole, null) === 'manager'

  const { data: found = [], isPending: prioritiesPending } = useQuery(prioritiesQuery(active?.id))
  const isPending = departmentsPending || prioritiesPending

  // Under All, department by department in board order; the sort keeps each one's hierarchy.
  const rank = (id: number | null) => ordered.findIndex(entry => entry.id === id)
  const priorities = active
    ? found
    : found.toSorted((a, b) => rank(a.department) - rank(b.department))

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <DepartmentPills departments={ordered} active={active} onChange={onDepartmentChange} />

      <div className='flex items-center gap-3.5'>
        {priorities.length ? (
          <p className='text-sm text-muted-foreground'>
            <span className='font-semibold text-foreground'>{priorities.length}</span>{' '}
            {priorities.length === 1 ? 'priority' : 'priorities'}
            {active ? ` in ${active.name}` : ''}
            <span className='text-xs'>
              {!canEdit
                ? ' · only a Manager changes them'
                : active
                  ? ` · drag ${active.name}'s own rows to reorder; Every department ones reorder under All`
                  : ' · drag Every department rows to reorder them; a department’s own reorder under it'}
            </span>
          </p>
        ) : null}

        {/* Stays on the right with or without the count before it. */}
        {canEdit ? (
          <div className='ml-auto'>
            <CreatePriorityDialog departmentId={active?.id} />
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
              {canEdit
                ? `Add one to get started${active ? ` for ${active.name}` : ''}.`
                : 'A Manager adds them.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <PrioritiesTable
          priorities={priorities}
          scope={active?.id ?? null}
          departments={active ? undefined : ordered}
          isPending={isPending}
          readOnly={!canEdit}
        />
      )}
    </section>
  )
}
