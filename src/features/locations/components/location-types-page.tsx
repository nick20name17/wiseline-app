import { useColumnOrder, type ColumnTable } from '@/components/table/column-order'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/search-input'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { departmentByCode } from '@/lib/departments'
import { useQuery } from '@tanstack/react-query'
import { Tags } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  departmentsQuery,
  locationTypesQuery,
  warehousePickerQuery,
  LOCATION_KIND_LABELS
} from '../api'
import { rackedDepartments } from '../lib/departments'
import { DepartmentPills } from '@/components/department-pills'
import { LocationTypeActions } from './location-actions'
import { CreateLocationTypeDialog } from './location-type-dialog'

const SEARCH_DEBOUNCE_MS = 250

// Under one department the pill already says which, so the table drops Department there.
const COLUMNS: ColumnTable = {
  table: 'location-types',
  columns: [
    { key: 'name', label: 'Name', width: 'w-48', align: 'start', card: 'title' },
    { key: 'warehouse', label: 'Warehouse', width: 'w-40' },
    { key: 'department', label: 'Department', width: 'w-36' },
    // Wide enough for the Inventory badge.
    { key: 'holds', label: 'Holds', width: 'w-36' },
    { key: 'description', label: 'Description', align: 'start', card: 'full' }
  ]
}

type LocationTypesPageProps = {
  search: string | undefined
  department: string | undefined
  onSearchChange: (search: string | undefined) => void
  onDepartmentChange: (department: string | undefined) => void
}

/**
 * Location types are how a location gets a department: the type carries it, the locations under it
 * inherit it. Deleting one is refused while any location still points at it.
 */
export const LocationTypesPage = ({
  search,
  department,
  onSearchChange,
  onDepartmentChange
}: LocationTypesPageProps) => {
  const { data: page, isPending } = useQuery(locationTypesQuery(search))
  const { data: departments } = useQuery(departmentsQuery)
  const { data: warehouses } = useQuery(warehousePickerQuery)

  const [term, setTerm] = useState(search ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (value: string) => {
    setTerm(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onSearchChange(value || undefined), SEARCH_DEBOUNCE_MS)
  }

  const racked = rackedDepartments(departments)
  const active = departmentByCode(racked, department)
  // A type carries its department, so one department's types are narrowed here from the one list.
  const types = (page?.results ?? []).filter(type => !active || type.department_id === active.id)
  const columns = useColumnOrder({
    ...COLUMNS,
    columns: COLUMNS.columns.filter(column => !active || column.key !== 'department')
  })

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <DepartmentPills departments={racked} active={active} onChange={onDepartmentChange} />

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

        <CreateLocationTypeDialog departmentId={active?.id} />
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
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table data-cards className='min-w-3xl table-fixed'>
            <colgroup>
              {columns.cols}
              <col className='w-24' />
            </colgroup>
            <TableHeader>
              <TableRow>
                {columns.headers}
                <TableHead>
                  {/* The column is obvious from its buttons; the label is for screen readers. */}
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows actions />
              ) : (
                types.map(type => (
                  <TableRow key={type.id}>
                    {columns.cells({
                      name: <TableCell>{type.name ?? '—'}</TableCell>,
                      warehouse: (
                        <TableCell>
                          {warehouses?.find(warehouse => warehouse.id === type.warehouse_id)
                            ?.name ?? '—'}
                        </TableCell>
                      ),
                      department: (
                        <TableCell>
                          {departments?.find(entry => entry.id === type.department_id)?.name ?? '—'}
                        </TableCell>
                      ),
                      holds: (
                        <TableCell>
                          {type.kind === 'inventory' ? (
                            <Badge variant='muted'>Inventory</Badge>
                          ) : (
                            LOCATION_KIND_LABELS[type.kind]
                          )}
                        </TableCell>
                      ),
                      description: (
                        <TableCell>
                          <span className='truncate text-muted-foreground'>
                            {type.description ?? '—'}
                          </span>
                        </TableCell>
                      )
                    })}
                    <TableCell card='trail'>
                      <LocationTypeActions locationType={type} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
