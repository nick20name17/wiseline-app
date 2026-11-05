import { SearchInput } from '@/components/search-input'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { departmentByCode } from '@/lib/departments'
import { useQuery } from '@tanstack/react-query'
import { Tags } from 'lucide-react'
import { useRef, useState } from 'react'
import { departmentsQuery, locationTypesQuery, type LocationKind } from '../api'
import { rackedDepartments } from '../lib/departments'
import { DepartmentTabs } from '@/components/department-tabs'
import { KindTabs } from './kind-tabs'
import { CreateLocationTypeDialog } from './location-type-dialog'
import { LocationTypesTable } from './location-types-table'

const SEARCH_DEBOUNCE_MS = 250

type LocationTypesPageProps = {
  search: string | undefined
  department: string | undefined
  kind: LocationKind
  onSearchChange: (search: string | undefined) => void
  onDepartmentChange: (department: string) => void
  onKindChange: (kind: LocationKind) => void
}

/**
 * Location types are how a location gets a department: the type carries it, the locations under it
 * inherit it. Deleting one is refused while any location still points at it. Their order here is the
 * order the Select Location window lists them in.
 */
export const LocationTypesPage = ({
  search,
  department,
  kind,
  onSearchChange,
  onDepartmentChange,
  onKindChange
}: LocationTypesPageProps) => {
  const { data: page, isPending: rowsPending } = useQuery(locationTypesQuery(search))
  const { data: departments, isPending: departmentsPending } = useQuery(departmentsQuery)
  // The rows are narrowed to a department, so they wait for which one too.
  const isPending = rowsPending || departmentsPending

  const [term, setTerm] = useState(search ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (value: string) => {
    setTerm(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onSearchChange(value || undefined), SEARCH_DEBOUNCE_MS)
  }

  const racked = rackedDepartments(departments)
  // One department at a time, the first unless the link names another.
  const active = departmentByCode(racked, department) ?? racked[0]
  // A type carries its department, so one department's types are narrowed here from the one list.
  const types = (page?.results ?? []).filter(
    type => type.department_id === active?.id && type.kind === kind
  )

  return (
    <section className='flex flex-1 flex-col gap-4 lg:min-h-0'>
      <DepartmentTabs departments={racked} active={active} onChange={onDepartmentChange} />
      <KindTabs kind={kind} noun='Location Types' onChange={onKindChange} />

      <div className='flex flex-wrap items-center justify-end gap-3.5 max-sm:*:last:flex-1'>
        {/* On a phone the add button spans the top line and the search takes the full line below it. */}
        <div className='flex min-w-0 flex-1 items-center gap-3 max-sm:order-1 max-sm:basis-full'>
          <SearchInput
            className='sm:max-w-60'
            label='Search location types'
            value={term}
            onValueChange={handleSearch}
          />

          {types.length ? (
            <p className='shrink-0 text-sm text-muted-foreground'>
              {types.length} {types.length === 1 ? 'location type' : 'location types'}
              {active ? ` in ${active.name}` : ''}
            </p>
          ) : null}
        </div>

        <CreateLocationTypeDialog departmentId={active?.id} kind={kind} />
      </div>

      {!isPending && !types.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Tags />
            </EmptyMedia>
            <EmptyTitle>No location types yet</EmptyTitle>
            <EmptyDescription>
              {search
                ? `Nothing matches “${search}”.`
                : `Add one to get started${active ? ` for ${active.name}` : ''}.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <LocationTypesTable
          types={types}
          departmentId={active?.id}
          isPending={isPending}
          searching={!!search}
        />
      )}
    </section>
  )
}
