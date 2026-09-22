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
import { Input } from '@/components/ui/input'
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
import { Cog, Pencil, Trash2 } from 'lucide-react'
import { Fragment, useState } from 'react'
import {
  categoriesQuery,
  departmentsQuery,
  KIND_LABELS,
  machinesQuery,
  useDeleteMachine,
  useSetCapacity,
  type Category,
  type Machine,
  type MachineKind
} from '../api'
import { CreateMachineDialog, UpdateMachineDialog } from './machine-dialog'

type CapacityCellProps = { category: Category }

/**
 * The department's ceiling for one day — the figure behind the day strip's `used / capacity`. It
 * hangs off the category rather than any machine, and is created the first time it is set.
 */
const CapacityCell = ({ category }: CapacityCellProps) => {
  const [draft, setDraft] = useState(category.capacity === null ? '' : String(category.capacity))
  const save = useSetCapacity()
  const saved = category.capacity === null ? '' : String(category.capacity)

  return (
    <span className='flex items-center gap-2'>
      <span className='text-xs tracking-wider text-muted-foreground uppercase'>Daily capacity</span>
      <Input
        className='w-28'
        type='number'
        min={0}
        inputMode='numeric'
        aria-label={`Daily capacity for ${category.name ?? category.id}`}
        placeholder='Not set'
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onBlur={() =>
          draft !== saved &&
          draft.trim() !== '' &&
          save.mutate({
            capacityId: category.capacity_id,
            category: category.id,
            perDay: Number(draft)
          })
        }
      />
    </span>
  )
}

/**
 * The machines every department's board is built out of: what each one does, how much it can take in
 * a day, and the order its tab stands in.
 */
export const MachinesPage = () => {
  const { data: machines, isPending } = useQuery(machinesQuery)
  const { data: categories } = useQuery(categoriesQuery)
  const { data: departments } = useQuery(departmentsQuery)

  const [editing, setEditing] = useState<Machine | null>(null)
  const [removing, setRemoving] = useState<Machine | null>(null)
  const remove = useDeleteMachine(() => setRemoving(null))

  // Machines are read per category, because that is what a department's board is scoped to.
  const groups = (categories ?? []).map(category => ({
    category,
    machines: (machines ?? []).filter(machine => machine.category === category.id)
  }))
  const orphans = (machines ?? []).filter(
    machine => !categories?.some(category => category.id === machine.category)
  )

  return (
    <section className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-3.5'>
        <p className='text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>{machines?.length ?? 0}</span>{' '}
          {machines?.length === 1 ? 'machine' : 'machines'}
        </p>
        <CreateMachineDialog />
      </div>

      {!isPending && !machines?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Cog />
            </EmptyMedia>
            <EmptyTitle>No machines</EmptyTitle>
            <EmptyDescription>
              A department with no machines has nothing to route a trim to, and no Production tab to
              speak of.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table className='min-w-4xl table-fixed'>
            <colgroup>
              <col className='w-64' />
              <col className='w-44' />
              <col className='w-36' />
              <col className='w-36' />
              <col className='w-32' />
              <col />
              <col className='w-24' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>What it does</TableHead>
                <TableHead>Max bends</TableHead>
                <TableHead>Max pieces</TableHead>
                <TableHead>Position</TableHead>
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
                [
                  ...groups,
                  // A machine whose category EBMS no longer sends still has to be reachable.
                  ...(orphans.length
                    ? [
                        {
                          category: {
                            id: '',
                            name: 'No category',
                            capacity: null,
                            capacity_id: null
                          },
                          machines: orphans
                        }
                      ]
                    : [])
                ].map(group => (
                  <Fragment key={group.category.id || 'none'}>
                    <TableRow>
                      <TableCell colSpan={7}>
                        <span className='flex flex-wrap items-center gap-4'>
                          <span className='text-xs font-semibold tracking-wider uppercase'>
                            {group.category.name ?? group.category.id}
                          </span>
                          {group.category.id ? <CapacityCell category={group.category} /> : null}
                        </span>
                      </TableCell>
                    </TableRow>

                    {group.machines.map(machine => (
                      <TableRow key={machine.id}>
                        <TableCell>{machine.name ?? '—'}</TableCell>
                        <TableCell>
                          {departments?.find(department => department.id === machine.department)
                            ?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          {KIND_LABELS[machine.kind as MachineKind] ?? (
                            <span className='text-muted-foreground'>—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className='font-mono'>{machine.daily_max_bends ?? '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className='font-mono'>{machine.daily_max_pieces ?? '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className='font-mono text-muted-foreground'>
                            {machine.position ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className='flex justify-end gap-1 text-muted-foreground'>
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              aria-label={`Edit ${machine.name}`}
                              onClick={() => setEditing(machine)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              aria-label={`Delete ${machine.name}`}
                              onClick={() => setRemoving(machine)}
                            >
                              <Trash2 />
                            </Button>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {editing ? (
        <UpdateMachineDialog
          machine={editing}
          open
          onOpenChange={open => !open && setEditing(null)}
        />
      ) : null}

      <AlertDialog open={!!removing} onOpenChange={open => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete machine {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its tab goes with it, and the line items routed to it are left without a machine. This
              cannot be undone.
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
                      title: 'The machine stayed',
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
