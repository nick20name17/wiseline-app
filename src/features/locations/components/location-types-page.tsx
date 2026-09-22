import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Search, Tags, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  departmentsQuery,
  locationTypesQuery,
  useDeleteLocationType,
  warehousePickerQuery,
  type LocationType
} from '../api'
import { activeDepartment, rackedDepartments } from '../lib/departments'
import { DepartmentPills } from './department-pills'
import { CreateLocationTypeDialog, UpdateLocationTypeDialog } from './location-type-dialog'

const SEARCH_DEBOUNCE_MS = 250

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

  const [editing, setEditing] = useState<LocationType | null>(null)
  const [removing, setRemoving] = useState<LocationType | null>(null)
  const [removed, releaseRemoved] = useRetained(removing)
  const remove = useDeleteLocationType(() => setRemoving(null))

  const [term, setTerm] = useState(search ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (value: string) => {
    setTerm(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onSearchChange(value || undefined), SEARCH_DEBOUNCE_MS)
  }

  const racked = rackedDepartments(departments)
  const active = activeDepartment(racked, department)
  // A type carries its department, so one department's types are narrowed here from the one list.
  const types = (page?.results ?? []).filter(type => !active || type.department_id === active.id)

  return (
    <section className='flex flex-col gap-4'>
      <DepartmentPills departments={racked} active={active} onChange={onDepartmentChange} />

      <div className='flex items-center justify-between gap-3.5'>
        <div className='flex items-center gap-3'>
          <InputGroup className='w-60'>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type='search'
              aria-label='Search location types'
              placeholder='Search...'
              value={term}
              onChange={event => handleSearch(event.target.value)}
            />
          </InputGroup>

          {types.length ? (
            <p className='text-sm text-muted-foreground'>
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
          <Table className='min-w-3xl table-fixed'>
            <colgroup>
              <col className='w-64' />
              <col className='w-56' />
              {active ? null : <col className='w-44' />}
              <col />
              <col className='w-24' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Warehouse</TableHead>
                {/* Under one department the pill already says which; under All it is a column. */}
                {active ? null : <TableHead>Department</TableHead>}
                <TableHead>Description</TableHead>
                <TableHead>
                  {/* The column is obvious from its buttons; the label is for screen readers. */}
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={active ? 3 : 4} />
              ) : (
                types.map(type => (
                  <TableRow key={type.id}>
                    <TableCell>{type.name ?? '—'}</TableCell>
                    <TableCell>
                      {warehouses?.find(warehouse => warehouse.id === type.warehouse_id)?.name ??
                        '—'}
                    </TableCell>
                    {active ? null : (
                      <TableCell>
                        {departments?.find(entry => entry.id === type.department_id)?.name ?? '—'}
                      </TableCell>
                    )}
                    <TableCell>
                      <span className='truncate text-muted-foreground'>
                        {type.description ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className='flex justify-end gap-1 text-muted-foreground'>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          aria-label={`Edit ${type.name}`}
                          onClick={() => setEditing(type)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          aria-label={`Delete ${type.name}`}
                          onClick={() => setRemoving(type)}
                        >
                          <Trash2 />
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {editing ? (
        <UpdateLocationTypeDialog
          locationType={editing}
          open
          onOpenChange={open => !open && setEditing(null)}
        />
      ) : null}

      <AlertDialog
        open={!!removing}
        onOpenChange={open => !open && setRemoving(null)}
        onOpenChangeComplete={releaseRemoved}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete location type {removed?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {/* The API refuses while any location still points here, so say it first. */}
              The locations under it would be left without a department, so the delete is refused
              while any of them still exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant='outline' />}>Cancel</AlertDialogCancel>
            <Button
              variant='destructive'
              disabled={remove.isPending}
              onClick={() =>
                removing &&
                remove.mutate(removing.id, {
                  onError: error =>
                    toast.add({
                      type: 'error',
                      title: 'The type stayed',
                      description: error.message
                    })
                })
              }
            >
              {remove.isPending ? <Spinner data-icon='inline-start' /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
