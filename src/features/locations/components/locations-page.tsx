import { QrLabels } from '@/components/qr-labels'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/search-input'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Badge } from '@/components/ui/badge'
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
import { MapPin, Printer } from 'lucide-react'
import { useRef, useState } from 'react'
import { useColumnOrder, type ColumnTable } from '@/components/table/column-order'
import { sortRows, type Sort } from '@/lib/sort-rows'
import {
  allLocationTypesQuery,
  departmentsQuery,
  locationsQuery,
  warehousePickerQuery,
  type Location
} from '../api'
import { rackedDepartments } from '../lib/departments'
import { DepartmentPills } from '@/components/department-pills'
import { LocationActions } from './location-actions'
import { CreateLocationDialog } from './location-dialog'

const SEARCH_DEBOUNCE_MS = 250

// Code, warehouse, type and weight sort the list, as EBMS's own headings do.
const COLUMNS: ColumnTable = {
  table: 'locations',
  columns: [
    { key: 'name', label: 'Name', width: 'w-40', align: 'start', card: 'title', sortable: true },
    { key: 'warehouse', label: 'Warehouse', width: 'w-40', sortable: true },
    { key: 'type', label: 'Location Type', width: 'w-36', sortable: true },
    { key: 'weight', label: 'Max Weight', width: 'w-32', sortable: true },
    { key: 'multi', label: 'Multi Order', width: 'w-32' },
    { key: 'description', label: 'Description', align: 'start', card: 'full' }
  ]
}

type LocationsPageProps = {
  search: string | undefined
  department: string | undefined
  onSearchChange: (search: string | undefined) => void
  onDepartmentChange: (department: string | undefined) => void
}

/**
 * Every place a package can stand, one department at a time. A location takes its department from
 * its type, which is the one place it is set, so that is what narrows the list.
 */
export const LocationsPage = ({
  search,
  department,
  onSearchChange,
  onDepartmentChange
}: LocationsPageProps) => {
  const { data: page, isPending } = useQuery(locationsQuery(search))
  const { data: warehouses } = useQuery(warehousePickerQuery)
  const { data: types } = useQuery(allLocationTypesQuery)
  const { data: departments } = useQuery(departmentsQuery)

  const [term, setTerm] = useState(search ?? '')
  // By name, numbers as numbers: a location added to a series lands in it, not at the bottom.
  const [printing, setPrinting] = useState(false)
  const [sort, setSort] = useState<Sort<string>>({ key: 'name', desc: false })
  const columns = useColumnOrder(COLUMNS, { sort, onSort: setSort })
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (value: string) => {
    setTerm(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onSearchChange(value || undefined), SEARCH_DEBOUNCE_MS)
  }

  const racked = rackedDepartments(departments)
  const active = departmentByCode(racked, department)
  const typeOf = (location: Location) => types?.find(type => type.id === location.location_type_id)
  const locations = sortRows(
    (page?.results ?? []).filter(
      location => !active || typeOf(location)?.department_id === active.id
    ),
    sort,
    (location, key) =>
      key === 'name'
        ? location.code
        : key === 'warehouse'
          ? (warehouses?.find(warehouse => warehouse.id === location.warehouse_id)?.name ?? null)
          : key === 'type'
            ? (typeOf(location)?.name ?? null)
            : location.weight
  )

  // The ones a coil is put on, which the forklift scans: each gets a label with its code.
  const inventory = locations.filter(
    location => typeOf(location)?.kind === 'inventory' && location.code
  )

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <DepartmentPills departments={racked} active={active} onChange={onDepartmentChange} />

      <div className='flex flex-wrap items-center justify-end gap-3.5 max-sm:*:last:flex-1'>
        {/* On a phone the add button spans the top line and the search takes the full line below it. */}
        <div className='flex min-w-0 flex-1 items-center gap-3 max-sm:order-1 max-sm:basis-full'>
          <SearchInput
            className='sm:max-w-60'
            label='Search locations'
            value={term}
            onValueChange={handleSearch}
          />

          {locations.length ? (
            <p className='shrink-0 text-sm text-muted-foreground'>
              {locations.length} {locations.length === 1 ? 'location' : 'locations'}
              {active ? ` in ${active.name}` : ''}
            </p>
          ) : null}
        </div>

        {inventory.length ? (
          <Button variant='outline' onClick={() => setPrinting(true)}>
            <Printer data-icon='inline-start' />
            Print inventory labels
          </Button>
        ) : null}
        <CreateLocationDialog department={active} />
      </div>

      {printing ? (
        <QrLabels
          labels={inventory.map(location => ({
            key: String(location.id),
            code: location.code ?? '',
            title: location.code ?? '',
            detail: typeOf(location)?.name
          }))}
          onDone={() => setPrinting(false)}
        />
      ) : null}

      {!isPending && !locations.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <MapPin />
            </EmptyMedia>
            <EmptyTitle>No locations yet</EmptyTitle>
            <EmptyDescription>
              {search ? `Nothing matches “${search}”.` : 'Add one to get started.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table data-cards className='min-w-5xl table-fixed'>
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
                locations.map(location => (
                  <TableRow key={location.id}>
                    {columns.cells({
                      name: (
                        <TableCell>
                          <span className='font-mono'>{location.code ?? '—'}</span>
                        </TableCell>
                      ),
                      warehouse: (
                        <TableCell>
                          {warehouses?.find(warehouse => warehouse.id === location.warehouse_id)
                            ?.name ?? '—'}
                        </TableCell>
                      ),
                      type: <TableCell>{typeOf(location)?.name ?? '—'}</TableCell>,
                      weight: (
                        <TableCell>
                          <span className='font-mono'>{location.weight ?? '—'}</span>
                        </TableCell>
                      ),
                      multi: (
                        <TableCell>
                          {location.multi_order ? (
                            <Badge variant='soft'>{location.max_orders ?? 'Any'}</Badge>
                          ) : (
                            <span className='text-muted-foreground'>—</span>
                          )}
                        </TableCell>
                      ),
                      description: (
                        <TableCell>
                          <span className='truncate text-muted-foreground'>
                            {location.description ?? '—'}
                          </span>
                        </TableCell>
                      )
                    })}
                    <TableCell card='trail'>
                      <LocationActions location={location} />
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
