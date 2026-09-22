import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'
import { Database, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import {
  coilFiltersQuery,
  coilLotsQuery,
  useSetCoilLocation,
  useUpdateCoilLot,
  type CoilLot,
  type CoilScope
} from '../api'
import { CoilAdjustDialog } from './coil-adjust-dialog'

const figure = (value: number | null) =>
  value === null ? '—' : new Intl.NumberFormat('en-US').format(value)

const matches = (lot: CoilLot, term: string) =>
  [lot.product_id, lot.lot_number, lot.note].some(field =>
    (field ?? '').toLowerCase().includes(term)
  )

type NoteCellProps = { lot: CoilLot; disabled: boolean }

/** The coil's own note, saved when the field is left. */
const NoteCell = ({ lot, disabled }: NoteCellProps) => {
  const [draft, setDraft] = useState(lot.note ?? '')
  const update = useUpdateCoilLot()

  return (
    <Input
      aria-label={`Note on coil ${lot.lot_number ?? lot.id}`}
      placeholder='Note…'
      disabled={disabled}
      value={draft}
      onChange={event => setDraft(event.target.value)}
      onBlur={() =>
        draft !== (lot.note ?? '') && update.mutate({ lotId: lot.id, edit: { note: draft } })
      }
    />
  )
}

type CoilsTabProps = {
  departmentId: number | undefined
  readOnly: boolean
}

/**
 * The coils EBMS has sent this department. A coil is checked into a department and, inside Trim, into
 * the Slinet; its figures are adjusted from here and pushed back. The rules about which box may be
 * ticked are the server's — this reads what it says about each coil rather than guessing.
 */
export const CoilsTab = ({ departmentId, readOnly }: CoilsTabProps) => {
  const [scope, setScope] = useState<CoilScope>('trim')
  const [term, setTerm] = useState('')
  const [adjusting, setAdjusting] = useState<CoilLot | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const { data: lots, isPending } = useQuery(coilLotsQuery(scope))
  const { data: filters } = useQuery(coilFiltersQuery(departmentId))
  const setLocation = useSetCoilLocation()

  const move = (lot: CoilLot, location: Parameters<typeof setLocation.mutate>[0]['location']) =>
    setLocation.mutate(
      { lotId: lot.id, location },
      {
        onError: error =>
          toast.add({
            type: 'error',
            title: 'The coil stayed where it was',
            description: error.message
          })
      }
    )

  const search = term.trim().toLowerCase()
  const coils = (lots ?? []).filter(lot => !search || matches(lot, search))

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <Tabs value={scope} onValueChange={value => setScope(value as CoilScope)}>
        <TabsList className='h-9'>
          <TabsTrigger value='trim'>Trim coils</TabsTrigger>
          <TabsTrigger value='all'>All coils</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className='flex flex-wrap items-center gap-3'>
        <p className='text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>{coils.length}</span>{' '}
          {coils.length === 1 ? 'coil' : 'coils'}
        </p>

        <InputGroup className='w-80'>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type='search'
            aria-label='Search coils'
            placeholder='Product ID, coil # or note...'
            value={term}
            onChange={event => setTerm(event.target.value)}
          />
        </InputGroup>

        <Button variant='outline' className='ml-auto' onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal data-icon='inline-start' />
          Coil filter
        </Button>
      </div>

      {!isPending && !coils.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Database />
            </EmptyMedia>
            <EmptyTitle>No coils</EmptyTitle>
            <EmptyDescription>
              {search
                ? `Nothing matches “${term}”.`
                : scope === 'trim'
                  ? 'No coil is checked into Trim. Look in All coils and check one in.'
                  : 'Coils arrive from EBMS once they pass this department’s coil filter.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table className='min-w-6xl table-fixed'>
            <colgroup>
              <col className='w-36' />
              <col className='w-32' />
              <col className='w-36' />
              <col className='w-32' />
              <col className='w-32' />
              {/* Each of these columns is headed by a word longer than the box under it, and the
                  heading is what sets the width. */}
              <col className='w-32' />
              <col className='w-20' />
              <col className='w-36' />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Product ID</TableHead>
                <TableHead>Coil #</TableHead>
                <TableHead>Coil Thickness</TableHead>
                <TableHead>Linear Feet</TableHead>
                <TableHead>Weight (lbs.)</TableHead>
                <TableHead>Rollforming</TableHead>
                <TableHead>Trim</TableHead>
                <TableHead>Slinet In / Out</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={8} />
              ) : (
                coils.map(lot => (
                  <TableRow key={lot.id}>
                    <TableCell>
                      <span className='font-mono'>{lot.product_id ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className='font-mono'>{lot.lot_number ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      {/* The three figures are one control: clicking any of them opens the window
                          that works the other two out. */}
                      <Button
                        variant='link'
                        disabled={readOnly}
                        aria-label={`Adjust coil ${lot.lot_number ?? lot.id}`}
                        onClick={() => setAdjusting(lot)}
                      >
                        <span className='font-mono'>{figure(lot.coil_thickness)}</span>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant='link' disabled={readOnly} onClick={() => setAdjusting(lot)}>
                        <span className='font-mono'>{figure(lot.linear_feet)}</span>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant='link' disabled={readOnly} onClick={() => setAdjusting(lot)}>
                        <span className='font-mono'>{figure(lot.weight)}</span>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        aria-label={`Rollforming holds coil ${lot.lot_number ?? lot.id}`}
                        checked={lot.in_rollforming}
                        disabled={readOnly || (!lot.in_rollforming && !lot.rollforming_available)}
                        onCheckedChange={checked => move(lot, { in_rollforming: !!checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        aria-label={`Trim holds coil ${lot.lot_number ?? lot.id}`}
                        checked={lot.in_trim}
                        disabled={readOnly}
                        onCheckedChange={checked => move(lot, { in_trim: !!checked })}
                      />
                    </TableCell>
                    <TableCell>
                      {/* The Slinet sits inside Trim and needs a Coil Thickness before it opens. */}
                      <Checkbox
                        aria-label={`Slinet holds coil ${lot.lot_number ?? lot.id}`}
                        checked={lot.in_slinet}
                        disabled={readOnly || (!lot.in_slinet && !lot.slinet_available)}
                        onCheckedChange={checked => move(lot, { in_slinet: !!checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <NoteCell lot={lot} disabled={readOnly} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CoilAdjustDialog lot={adjusting} onOpenChange={open => !open && setAdjusting(null)} />

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Coil filter</DialogTitle>
            <DialogDescription>
              Which coils EBMS sends this department. The bounds are set in the admin window; this
              is what they are now.
            </DialogDescription>
          </DialogHeader>

          <div className='scrollport max-h-96 min-h-40 flex-col gap-3 overflow-y-auto'>
            {filters?.length ? (
              filters.map(filter => (
                <div key={filter.id} className='rounded-lg border border-border p-3 text-sm'>
                  <p className='font-medium'>{filter.folder_name ?? 'Every folder'}</p>
                  <p className='text-muted-foreground'>
                    {filter.apply_all
                      ? 'No bounds — every coil in this folder.'
                      : `Thickness ${filter.thickness_min ?? '—'}–${filter.thickness_max ?? '—'}, width ${filter.width_min ?? '—'}–${filter.width_max ?? '—'}, grade ${filter.grade_min ?? '—'}–${filter.grade_max ?? '—'}.`}
                  </p>
                </div>
              ))
            ) : (
              <p className='text-sm text-muted-foreground'>
                No filter is set, so every coil EBMS holds reaches this department.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
