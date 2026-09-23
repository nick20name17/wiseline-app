import { DepartmentPills } from '@/components/department-pills'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { departmentByCode, inBoardOrder } from '@/lib/departments'
import { useQuery } from '@tanstack/react-query'
import { Flag } from 'lucide-react'
import { departmentsQuery, prioritiesQuery } from '../api'
import { PrioritiesTable } from './priorities-table'
import { CreatePriorityDialog } from './priority-dialog'

type PrioritiesPageProps = {
  department: string | undefined
  onDepartmentChange: (department: string | undefined) => void
}

/**
 * The priorities each department's board sorts by. Under one department the row order is the
 * hierarchy and the rows are dragged to change it; under All each row names its department.
 */
export const PrioritiesPage = ({ department, onDepartmentChange }: PrioritiesPageProps) => {
  const { data: departments, isPending: departmentsPending } = useQuery(departmentsQuery)
  const ordered = inBoardOrder(departments)
  const active = departmentByCode(ordered, department)

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
              {active
                ? ' · drag rows to reorder hierarchy'
                : ' · pick a department to reorder its hierarchy'}
            </span>
          </p>
        ) : null}

        {/* Stays on the right with or without the count before it. */}
        <div className='ml-auto'>
          <CreatePriorityDialog departmentId={active?.id} />
        </div>
      </div>

      {!isPending && !priorities.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Flag />
            </EmptyMedia>
            <EmptyTitle>No priorities yet</EmptyTitle>
            <EmptyDescription>
              Add one to get started{active ? ` for ${active.name}` : ''}.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <PrioritiesTable
          priorities={priorities}
          departments={active ? undefined : ordered}
          isPending={isPending}
        />
      )}
    </section>
  )
}
