import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
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
import { MapPin, Search } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  allLocationTypesQuery,
  departmentsQuery,
  locationsQuery,
  warehousePickerQuery
} from '../api'
import { rackedDepartments } from '../lib/departments'
import { DepartmentPills } from '@/components/department-pills'
import { LocationActions } from './location-actions'
import { CreateLocationDialog } from './location-dialog'

const SEARCH_DEBOUNCE_MS = 250

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
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (value: string) => {
    setTerm(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onSearchChange(value || undefined), SEARCH_DEBOUNCE_MS)
  }

  const racked = rackedDepartments(departments)
  const active = departmentByCode(racked, department)
  const locations = (page?.results ?? []).filter(
    location =>
      !active ||
      types?.find(type => type.id === location.location_type_id)?.department_id === active.id
  )

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <DepartmentPills departments={racked} active={active} onChange={onDepartmentChange} />

      <div className='flex flex-wrap items-center justify-end gap-3.5 max-sm:*:last:flex-1'>
        {/* On a phone the add button spans the top line and the search takes the full line below it. */}
        <div className='flex min-w-0 flex-1 items-center gap-3 max-sm:order-1 max-sm:basis-full'>
          <InputGroup className='sm:max-w-60'>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type='search'
              aria-label='Search locations'
              placeholder='Search...'
              value={term}
              onChange={event => handleSearch(event.target.value)}
            />
          </InputGroup>

          {locations.length ? (
            <p className='shrink-0 text-sm text-muted-foreground'>
              {locations.length} {locations.length === 1 ? 'location' : 'locations'}
              {active ? ` in ${active.name}` : ''}
            </p>
          ) : null}
        </div>

        <CreateLocationDialog department={active} />
      </div>

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
          <Table data-cards className='min-w-6xl table-fixed'>
            <colgroup>
              <col className='w-40' />
              <col className='w-48' />
              <col className='w-48' />
              <col className='w-36' />
              <col className='w-40' />
              <col />
              <col className='w-24' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Location Type</TableHead>
                <TableHead>Max Weight</TableHead>
                <TableHead>Multi Order</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>
                  {/* The column is obvious from its buttons; the label is for screen readers. */}
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={6} />
              ) : (
                locations.map(location => (
                  <TableRow key={location.id}>
                    <TableCell card='title'>
                      <span className='font-mono'>{location.code ?? '—'}</span>
                    </TableCell>
                    <TableCell label='Warehouse'>
                      {warehouses?.find(warehouse => warehouse.id === location.warehouse_id)
                        ?.name ?? '—'}
                    </TableCell>
                    <TableCell label='Location Type'>
                      {types?.find(type => type.id === location.location_type_id)?.name ?? '—'}
                    </TableCell>
                    <TableCell label='Max Weight'>
                      <span className='font-mono'>{location.weight ?? '—'}</span>
                    </TableCell>
                    <TableCell label='Multi Order'>
                      {location.multi_order ? (
                        <Badge variant='soft'>{location.max_orders ?? 'Any'}</Badge>
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell label='Description' card='full'>
                      <span className='truncate text-muted-foreground'>
                        {location.description ?? '—'}
                      </span>
                    </TableCell>
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
