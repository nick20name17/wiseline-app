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
import { Badge } from '@/components/ui/badge'
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
import { useQuery } from '@tanstack/react-query'
import { MapPin, Pencil, Search, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  allLocationTypesQuery,
  locationsQuery,
  useDeleteLocation,
  warehousePickerQuery,
  type Location
} from '../api'
import { CreateLocationDialog, UpdateLocationDialog } from './location-dialog'

const SEARCH_DEBOUNCE_MS = 250

type LocationsPageProps = {
  search: string | undefined
  onSearchChange: (search: string | undefined) => void
}

/**
 * Every place a package can stand. The department is not a column here — a location takes it from
 * its type, which is the one place it is set.
 */
export const LocationsPage = ({ search, onSearchChange }: LocationsPageProps) => {
  const { data: page, isPending } = useQuery(locationsQuery(search))
  const { data: warehouses } = useQuery(warehousePickerQuery)
  const { data: types } = useQuery(allLocationTypesQuery)

  const [editing, setEditing] = useState<Location | null>(null)
  const [removing, setRemoving] = useState<Location | null>(null)
  const remove = useDeleteLocation(() => setRemoving(null))

  const [term, setTerm] = useState(search ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (value: string) => {
    setTerm(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onSearchChange(value || undefined), SEARCH_DEBOUNCE_MS)
  }

  const locations = page?.results ?? []

  return (
    <section className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-3.5'>
        <div className='flex items-center gap-3'>
          <InputGroup className='w-60'>
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
            <p className='text-sm text-muted-foreground'>
              {page?.count ?? locations.length}{' '}
              {(page?.count ?? locations.length) === 1 ? 'location' : 'locations'}
            </p>
          ) : null}
        </div>

        <CreateLocationDialog />
      </div>

      {!isPending && !locations.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <MapPin />
            </EmptyMedia>
            <EmptyTitle>No locations</EmptyTitle>
            <EmptyDescription>
              {search
                ? `Nothing matches “${search}”.`
                : 'Create one under a location type, which is what places it in a department.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table className='min-w-4xl table-fixed'>
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
                    <TableCell>
                      <span className='font-mono'>{location.code ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      {warehouses?.find(warehouse => warehouse.id === location.warehouse_id)
                        ?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      {types?.find(type => type.id === location.location_type_id)?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <span className='font-mono'>{location.weight ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      {location.multi_order ? (
                        <Badge variant='soft'>{location.max_orders ?? 'Any'}</Badge>
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className='truncate text-muted-foreground'>
                        {location.description ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className='flex justify-end gap-1 text-muted-foreground'>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          aria-label={`Edit ${location.code}`}
                          onClick={() => setEditing(location)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          aria-label={`Delete ${location.code}`}
                          onClick={() => setRemoving(location)}
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
        <UpdateLocationDialog
          location={editing}
          open
          onOpenChange={open => !open && setEditing(null)}
        />
      ) : null}

      <AlertDialog open={!!removing} onOpenChange={open => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete location {removing?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything standing on it loses where it is. This cannot be undone.
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
                      title: 'The location stayed',
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
