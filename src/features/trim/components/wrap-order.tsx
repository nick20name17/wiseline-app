import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { cn } from 'cn'
import { ArrowLeft, Check, MapPin, Printer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  orderCompleteQuery,
  orderLocationsQuery,
  useCompleteOrder,
  useCreatePackage,
  useRemoveOrderLocation,
  type LocationSlot,
  type WrappingRow
} from '../api'
import { itemStatus } from '../lib/status'
import { ConfirmDialog } from './confirm-dialog'
import { LocationDialog } from './location-dialog'
import { StatusPill } from './status-pill'

type WrapOrderProps = {
  departmentId: number | undefined
  /** Every released line of this one order, as the Wrapping list holds them. */
  rows: WrappingRow[]
  readOnly: boolean
  onBack: () => void
}

/**
 * One order at the wrapping bench: what is left to wrap on each line, the package being built out of
 * it, and the two things that finish it — Create & Print, and Order Complete.
 */
export const WrapOrder = ({ departmentId, rows, readOnly, onBack }: WrapOrderProps) => {
  const order = rows[0]
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [weight, setWeight] = useState('')
  const [location, setLocation] = useState<LocationSlot | null>(null)
  const [picking, setPicking] = useState(false)
  const [completing, setCompleting] = useState(false)

  const { data: locations } = useQuery(orderLocationsQuery(order?.order ?? null))
  const { data: completion } = useQuery(orderCompleteQuery(departmentId, order?.order ?? null))
  const removeLocation = useRemoveOrderLocation()
  const complete = useCompleteOrder(() => {
    setCompleting(false)
    onBack()
  })
  const createPackage = useCreatePackage(() => {
    setAmounts({})
    setWeight('')
    toast.add({ type: 'success', title: 'Package created' })
  })

  if (!order) return null

  const lines = rows
    .map(row => ({ row, quantity: Number(amounts[row.origin_item] ?? '') }))
    .filter(line => line.quantity > 0)

  const ordered = rows.reduce((total, row) => total + row.qty_ordered, 0)
  const wrapped = rows.reduce((total, row) => total + row.wrapped, 0)

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <span className='flex items-center gap-3'>
        <Button variant='outline' onClick={onBack}>
          <ArrowLeft data-icon='inline-start' />
          Back to Wrapping
        </Button>
        <span className='font-mono font-medium'>{order.order_number ?? order.order}</span>
        <span className='ml-auto font-mono text-sm text-muted-foreground'>
          {wrapped} / {ordered} wrapped
        </span>
      </span>

      <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Line item</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Qty ordered</TableHead>
              <TableHead>Wrapped</TableHead>
              <TableHead>Left to wrap</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Into this package</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.origin_item}>
                <TableCell>
                  <span className='font-mono'>{row.origin_item}</span>
                </TableCell>
                <TableCell>
                  <span className='truncate text-muted-foreground'>{row.description ?? '—'}</span>
                </TableCell>
                <TableCell>
                  <span className='font-mono'>{row.qty_ordered}</span>
                </TableCell>
                <TableCell>
                  <span className='font-mono'>{row.wrapped}</span>
                </TableCell>
                <TableCell>
                  <span className='font-mono'>{row.left_to_wrap}</span>
                </TableCell>
                <TableCell>
                  <StatusPill status={itemStatus(row.status)} />
                </TableCell>
                <TableCell>
                  <span className='flex items-center gap-2'>
                    <Input
                      className='w-20'
                      type='number'
                      min={0}
                      max={row.left_to_wrap}
                      inputMode='numeric'
                      aria-label={`Wrap from ${row.origin_item}`}
                      // A line that has not been made yet cannot be wrapped, whatever is left on it.
                      disabled={readOnly || !row.can_wrap}
                      value={amounts[row.origin_item] ?? ''}
                      onChange={event =>
                        setAmounts(current => ({
                          ...current,
                          [row.origin_item]: event.target.value
                        }))
                      }
                    />
                    <Button
                      variant='outline'
                      disabled={readOnly || !row.auto_fill_available}
                      onClick={() =>
                        setAmounts(current => ({
                          ...current,
                          [row.origin_item]: String(row.auto_fill_amount)
                        }))
                      }
                    >
                      Auto fill
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className='flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-xs'>
        <Button variant='outline' disabled={readOnly} onClick={() => setPicking(true)}>
          <MapPin data-icon='inline-start' />
          {location ? `Location ${location.name ?? location.location_id}` : 'Select location'}
        </Button>

        <span className='flex items-center gap-2'>
          <span className='text-xs tracking-wider text-muted-foreground uppercase'>
            Package weight
          </span>
          <Input
            className='w-24'
            type='number'
            min={0}
            inputMode='numeric'
            aria-label='Package weight'
            value={weight}
            onChange={event => setWeight(event.target.value)}
          />
          <span className='text-sm text-muted-foreground'>
            lb{location?.max_weight ? ` / ${location.remaining_weight ?? location.max_weight}` : ''}
          </span>
        </span>

        <Button
          className='ml-auto'
          disabled={readOnly || !location || !lines.length || createPackage.isPending}
          onClick={() =>
            departmentId &&
            location &&
            createPackage.mutate(
              {
                order: order.order,
                department_id: departmentId,
                location_id: location.location_id,
                lines: lines.map(line => ({
                  origin_item: line.row.origin_item,
                  quantity: line.quantity
                })),
                ...(weight.trim() ? { weight: Number(weight) } : {})
              },
              {
                onError: error =>
                  toast.add({
                    type: 'error',
                    title: 'Nothing was packed',
                    description: error.message
                  })
              }
            )
          }
        >
          <Printer data-icon='inline-start' />
          Create &amp; print
        </Button>

        <Button
          variant='outline'
          disabled={readOnly || !completion?.can_complete}
          title={
            completion?.can_complete
              ? undefined
              : `${completion?.outstanding.length ?? 0} line item(s) still have pieces left to wrap`
          }
          onClick={() => setCompleting(true)}
        >
          <Check data-icon='inline-start' />
          Order complete
        </Button>
      </div>

      {locations?.length ? (
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-xs tracking-wider text-muted-foreground uppercase'>
            Standing on
          </span>
          {locations.map(spot => (
            <span
              key={spot.location_id}
              className={cn(
                'flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm',
                // Everything but the newest is «put no more packages here».
                spot.orange && 'border-caution text-caution'
              )}
            >
              <span className='font-mono'>{spot.name ?? spot.location_id}</span>
              <span className='text-xs text-muted-foreground'>
                {spot.packages} pkg · {spot.weight_on_it} lb
              </span>
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label={`Take ${spot.name ?? spot.location_id} off this order`}
                disabled={readOnly || removeLocation.isPending}
                onClick={() =>
                  removeLocation.mutate(
                    { order: order.order, locationId: spot.location_id },
                    {
                      onError: error =>
                        toast.add({
                          type: 'error',
                          title: 'The location stayed',
                          description: error.message
                        })
                    }
                  )
                }
              >
                <Trash2 />
              </Button>
            </span>
          ))}
        </div>
      ) : null}

      <LocationDialog
        departmentId={departmentId}
        open={picking}
        onOpenChange={setPicking}
        onPick={setLocation}
      />

      <ConfirmDialog
        open={completing}
        onOpenChange={setCompleting}
        title='Mark this order complete?'
        description={`${completion?.manufacturing_batch.length ?? 0} line item(s) go to EBMS as a manufacturing batch — what was ordered minus what came from stock. The order then leaves Wrapping for Completed.`}
        confirmLabel='Yes, complete'
        cancelLabel='Cancel'
        isPending={complete.isPending}
        onConfirm={() => departmentId && complete.mutate({ order: order.order, departmentId })}
      />
    </div>
  )
}
