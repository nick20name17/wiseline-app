import { useColumnOrder } from '@/components/table/column-order'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Printer } from 'lucide-react'
import { useState } from 'react'
import {
  completedOrderQuery,
  orderLocationsQuery,
  remanufacturingsQuery,
  useReprintPackage,
  type CompletedDetail,
  type CompletedOrder,
  type OrderLocation
} from '../api'
import { COMPLETED_LINES_TABLE, COMPLETED_PACKAGES_TABLE, withoutStock } from '../lib/columns'
import { formatLongDate, formatStamp } from '../lib/format'
import { remanTotal } from '../lib/wrapping'
import { LocationChips, RemoveLocationDialog } from './location-dialog'

const titleOf = (order: CompletedOrder, isStock: boolean) =>
  `Completed · ${order.order_number ?? order.order}${isStock ? '' : ` · ${order.customer ?? '—'}`}`

const Facts = ({ order, isStock }: { order: CompletedOrder; isStock: boolean }) => {
  const facts = [
    { label: 'Customer', value: isStock ? 'Stock' : (order.customer ?? '—') },
    { label: 'Ship date', value: order.ship_date ? formatLongDate(order.ship_date) : 'N/A' },
    { label: 'Order #', value: order.order_number ?? '—' },
    {
      label: 'Production date',
      value: order.production_date ? formatLongDate(order.production_date) : '—'
    }
  ]

  return (
    <dl className='grid gap-x-8 gap-y-1 sm:grid-cols-2'>
      {facts.map(fact => (
        <div key={fact.label} className='flex items-baseline justify-between gap-4 text-sm'>
          <dt className='text-muted-foreground'>{fact.label}</dt>
          <dd className='font-medium'>{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const made = (line: { qty_ordered: number; from_stock: number }) =>
  Math.max(line.qty_ordered - line.from_stock, 0)

type LineItemsSectionProps = {
  detail: CompletedDetail
  isStock: boolean
}

/** What actually went to EBMS when the order was closed: ordered minus stock, line by line. */
const LineItemsSection = ({ detail, isStock }: LineItemsSectionProps) => {
  const { data: remans } = useQuery(remanufacturingsQuery)
  // A count, not the chain: every piece ever remade on the line.
  const remade = (originItem: string | null) =>
    remanTotal(
      (originItem ? (remans?.get(originItem) ?? []) : []).filter(
        reman => reman.order === detail.order
      )
    )
  const columns = useColumnOrder(
    isStock ? withoutStock(COMPLETED_LINES_TABLE) : COMPLETED_LINES_TABLE
  )

  return (
    <section className='flex flex-col gap-2'>
      <h3 className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
        Line items · manufacturing batch{' '}
        {detail.line_items.reduce((total, line) => total + made(line), 0)} pcs{' '}
        {isStock ? '(manufactured)' : '(Qty − Stock)'}
      </h3>
      <div className='overflow-hidden rounded-lg border border-border'>
        <Table>
          <TableHeader>
            <TableRow>{columns.headers}</TableRow>
          </TableHeader>
          <TableBody>
            {detail.line_items.map(line => {
              const remadeHere = remade(line.origin_item)

              return (
                <TableRow key={line.origin_item}>
                  {columns.cells({
                    pid: (
                      <TableCell>
                        <span className='font-mono'>{line.product_id ?? '—'}</span>
                      </TableCell>
                    ),
                    desc: (
                      <TableCell>
                        <span className='text-muted-foreground'>{line.description ?? '—'}</span>
                      </TableCell>
                    ),
                    qty: (
                      <TableCell>
                        <span className='font-mono'>{line.qty_ordered}</span>
                      </TableCell>
                    ),
                    stock: (
                      <TableCell>
                        <span className='font-mono'>{line.from_stock || '—'}</span>
                      </TableCell>
                    ),
                    mfg: (
                      <TableCell>
                        <span className='font-mono'>{made(line)}</span>
                      </TableCell>
                    ),
                    reman: (
                      <TableCell>
                        <span
                          className='font-mono'
                          title={
                            remadeHere
                              ? `${remadeHere} pcs. of material remade across every request raised on this line`
                              : undefined
                          }
                        >
                          {remadeHere || '—'}
                        </span>
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

/** The packages that carried the order out, each with a label the shop can print again. */
const PackagesSection = ({ packages }: { packages: CompletedDetail['packages'] }) => {
  const reprint = useReprintPackage()
  const columns = useColumnOrder(COMPLETED_PACKAGES_TABLE)

  return (
    <section className='flex flex-col gap-2'>
      <h3 className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
        Packages
      </h3>
      {!packages.length ? (
        <p className='text-sm text-muted-foreground'>No packages recorded.</p>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border'>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.headers}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map(parcel => (
                <TableRow key={parcel.package_id}>
                  {columns.cells({
                    name: (
                      <TableCell>
                        <span className='font-mono'>{parcel.name ?? '—'}</span>
                      </TableCell>
                    ),
                    contents: (
                      <TableCell>
                        <span className='text-muted-foreground'>
                          {parcel.contents
                            .map(item => `${item.quantity} × ${item.origin_item ?? '—'}`)
                            .join(', ') || '—'}
                        </span>
                      </TableCell>
                    ),
                    location: (
                      <TableCell>
                        <span className='font-mono'>{parcel.location ?? '—'}</span>
                      </TableCell>
                    )
                  })}
                  <TableCell>
                    <span className='flex justify-end'>
                      <Button
                        variant='outline'
                        disabled={reprint.isPending}
                        title='Reprint this package label'
                        onClick={() =>
                          reprint.mutate(parcel.package_id, {
                            onSuccess: () =>
                              toast.add({
                                type: 'success',
                                title: `Reprinted label ${parcel.name ?? parcel.package_id}`
                              })
                          })
                        }
                      >
                        <Printer data-icon='inline-start' />
                        Reprint
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

type CompletedOrderDialogProps = {
  departmentId: number | undefined
  order: CompletedOrder | null
  onOpenChange: (open: boolean) => void
}

/**
 * A finished order, opened from the list: the line items with what was taken from stock, and the
 * packages that carried them out — each with the label the shop can print again.
 */
export const CompletedOrderDialog = ({
  departmentId,
  order: current,
  onOpenChange
}: CompletedOrderDialogProps) => {
  const [order, release] = useRetained(current)
  const { data, isPending } = useQuery(completedOrderQuery(departmentId, order?.order ?? null))
  // "reprint package labels and change/add/remove locations if necessary" — an order that has gone
  // still has to be findable, and a location freed when it is no longer standing there.
  const { data: locations } = useQuery(orderLocationsQuery(order?.order ?? null))
  const [removing, setRemoving] = useState<OrderLocation | null>(null)

  // A stock order is what is being manufactured, so nothing on it came off the shelf.
  const isStock = !!(data?.is_stock ?? order?.is_stock)

  return (
    <Dialog open={!!current} onOpenChange={onOpenChange} onOpenChangeComplete={release}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>{order ? titleOf(order, isStock) : 'Completed order'}</DialogTitle>
          <DialogDescription>
            Line items with stock taken, plus what went into each package.
          </DialogDescription>
        </DialogHeader>

        <div className='scrollport flex max-h-104 min-h-56 flex-col gap-4 overflow-y-auto'>
          {isPending || !data ? (
            <Skeleton className='h-56' />
          ) : (
            <>
              <LineItemsSection detail={data} isStock={isStock} />

              <PackagesSection packages={data.packages} />

              {locations?.length ? (
                <section className='flex flex-wrap items-center gap-2'>
                  <h3 className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                    Trim location
                  </h3>
                  <LocationChips locations={locations} onRemove={setRemoving} />
                </section>
              ) : null}

              {order ? <Facts order={order} isStock={isStock} /> : null}

              <p className='text-center text-sm text-muted-foreground'>
                {data.completed_at
                  ? `Completed ${formatStamp(data.completed_at)}`
                  : 'Completion time not recorded'}
              </p>
            </>
          )}
        </div>
      </DialogContent>

      <RemoveLocationDialog
        order={order?.order ?? ''}
        locations={locations ?? []}
        location={removing}
        onOpenChange={open => !open && setRemoving(null)}
      />
    </Dialog>
  )
}
