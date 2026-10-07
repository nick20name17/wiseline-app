import { useBoard, useViewOnly } from '../lib/board-context'
import { formatLongDate } from '@/lib/days'
import { useColumnOrder } from '@/components/table/column-order'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { toggled } from '@/lib/sets'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Printer } from 'lucide-react'
import { useState } from 'react'
import {
  completedOrderQuery,
  orderLocationsQuery,
  remanufacturingsQuery,
  useMoveOrderPackages,
  useReprintPackage,
  type CompletedDetail,
  type CompletedOrder,
  type OrderLocation
} from '../api'
import { COMPLETED_PACKAGES_TABLE, withoutStock } from '../lib/columns'
import { formatStamp } from '../lib/format'
import { packageContents, remanTotal } from '../lib/wrapping'
import { LocationChips, LocationDialog, RemoveLocationDialog } from './location-dialog'

const titleOf = (order: CompletedOrder, isStock: boolean) =>
  `Completed · ${order.order_number ?? order.order}${isStock ? '' : ` · ${order.customer ?? '—'}`}`

/** The order info block under the tables: who it was for and how it goes out. */
const Facts = ({ detail, isStock }: { detail: CompletedDetail; isStock: boolean }) => {
  const { dateLabel } = useBoard()
  const date = (iso: string | null) => (iso ? formatLongDate(iso) : '—')
  const facts = [
    { label: 'Customer', value: isStock ? 'Stock' : (detail.customer ?? '—') },
    { label: 'Order #', value: detail.order_number ?? '—' },
    { label: 'PO', value: detail.po ?? '—' },
    { label: 'Salesman', value: detail.salesman ?? '—' },
    { label: 'Ship date', value: isStock ? 'N/A' : date(detail.ship_date) },
    { label: 'Ship via', value: detail.ship_via ?? '—' },
    { label: dateLabel, value: date(detail.production_date) },
    { label: 'Priority', value: detail.priority ?? '—' }
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

type LineItemsSectionProps = {
  departmentId: number | undefined
  detail: CompletedDetail
  isStock: boolean
}

/** What actually went to EBMS when the order was closed: ordered minus stock, line by line. */
const LineItemsSection = ({ departmentId, detail, isStock }: LineItemsSectionProps) => {
  const board = useBoard()
  const { data: remans } = useQuery(remanufacturingsQuery(departmentId))
  // A count, not the chain: every piece ever remade on the line.
  const remade = (originItem: string | null) =>
    remanTotal(
      (originItem ? (remans?.get(originItem) ?? []) : []).filter(
        reman => reman.order === detail.order
      )
    )
  const total = detail.line_items.reduce((sum, line) => sum + line.manufactured, 0)

  const columns = useColumnOrder(
    isStock ? withoutStock(board.tables.completedLines) : board.tables.completedLines
  )

  return (
    <section className='flex flex-col gap-2'>
      <h3 className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
        {board.makes
          ? `Line items · manufacturing batch ${total} pcs ${isStock ? '(manufactured)' : '(Qty − Stock)'}`
          : 'Line items'}
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
                        <span className='font-mono'>{line.manufactured}</span>
                      </TableCell>
                    ),
                    length: (
                      <TableCell>
                        <span className='font-mono'>
                          {line.length === null ? '—' : `${line.length}"`}
                        </span>
                      </TableCell>
                    ),
                    notes: (
                      <TableCell>
                        {/* Read here, not answered: the order is closed. */}
                        <span
                          className='line-clamp-2 text-muted-foreground'
                          title={line.notes.join('\n')}
                        >
                          {line.notes.length ? line.notes.join(' · ') : '—'}
                        </span>
                      </TableCell>
                    ),
                    packaged: (
                      <TableCell>
                        <span className='font-mono'>{line.packaged}</span>
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

type PackagesSectionProps = {
  packages: CompletedDetail['packages']
  lines: CompletedDetail['line_items']
  /** Ticked packages are the ones Select Location moves; none ticked moves them all. */
  picked: ReadonlySet<number>
  onToggle: (packageId: number) => void
}

/** The packages that carried the order out, each with a label the shop can print again. */
const PackagesSection = ({ packages, lines, picked, onToggle }: PackagesSectionProps) => {
  const reprint = useReprintPackage()
  const viewOnly = useViewOnly()
  const names = new Map(lines.map(line => [line.origin_item, line.product_id]))
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
                <TableHead className='w-10'>
                  <span className='sr-only'>Move</span>
                </TableHead>
                {columns.headers}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map(parcel => (
                <TableRow key={parcel.package_id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Move package ${parcel.name ?? parcel.package_id}`}
                      checked={picked.has(parcel.package_id)}
                      disabled={viewOnly}
                      onCheckedChange={() => onToggle(parcel.package_id)}
                    />
                  </TableCell>
                  {columns.cells({
                    name: (
                      <TableCell>
                        <span className='font-mono'>{parcel.name ?? '—'}</span>
                      </TableCell>
                    ),
                    contents: (
                      <TableCell>
                        <span className='text-muted-foreground'>
                          {packageContents(parcel.contents, names)}
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
                    {viewOnly ? null : (
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
                    )}
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
  const board = useBoard()
  const [order, release] = useRetained(current)
  const { data, isPending } = useQuery(completedOrderQuery(departmentId, order?.order ?? null))
  // "reprint package labels and change/add/remove locations if necessary" — an order that has gone
  // still has to be findable, and a location freed when it is no longer standing there.
  const { data: locations } = useQuery(orderLocationsQuery(order?.order ?? null))
  const [removing, setRemoving] = useState<OrderLocation | null>(null)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set())
  const move = useMoveOrderPackages()
  const viewOnly = useViewOnly()

  const toggle = (packageId: number) => setPicked(current => toggled(current, packageId))

  // A stock order is what is being manufactured, so nothing on it came off the shelf.
  const isStock = !!(data?.is_stock ?? order?.is_stock)

  return (
    <Dialog
      open={!!current}
      onOpenChange={onOpenChange}
      // Ticks belong to this order's packages; the next order opened here starts clean.
      onOpenChangeComplete={open => {
        if (!open) setPicked(new Set())
        release(open)
      }}
    >
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
              <LineItemsSection departmentId={departmentId} detail={data} isStock={isStock} />

              <PackagesSection
                packages={data.packages}
                lines={data.line_items}
                picked={picked}
                onToggle={toggle}
              />

              <section className='flex flex-wrap items-center gap-2'>
                <h3 className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                  {board.name} location
                </h3>
                {locations?.length ? (
                  <LocationChips locations={locations} onRemove={setRemoving} />
                ) : (
                  <span className='text-sm text-muted-foreground'>None</span>
                )}
                {/* p1 (912,576): a finished order can still be moved, or a location added to it by
                    moving only some of its packages. */}
                {viewOnly ? null : (
                  <Button
                    variant='outline'
                    className='ml-auto'
                    disabled={!data.packages.length}
                    onClick={() => setPicking(true)}
                  >
                    <MapPin data-icon='inline-start' />
                    {picked.size
                      ? `Move ${picked.size} package${picked.size === 1 ? '' : 's'}`
                      : 'Select location'}
                  </Button>
                )}
              </section>

              <Facts detail={data} isStock={isStock} />

              <p className='text-center text-sm text-muted-foreground'>
                {data.completed_at
                  ? `Completed ${formatStamp(data.completed_at)}`
                  : 'Completion time not recorded'}
              </p>
            </>
          )}
        </div>
      </DialogContent>

      <LocationDialog
        departmentId={departmentId}
        order={order?.order ?? null}
        orderNumber={order?.order_number ?? order?.order ?? ''}
        orderLocations={locations ?? []}
        stagedWeight={0}
        open={picking}
        onOpenChange={setPicking}
        onPick={slot =>
          order &&
          move.mutate(
            { order: order.order, locationId: slot.location_id, packageIds: [...picked] },
            {
              onSuccess: () => {
                toast.add({ type: 'success', title: `Moved to ${slot.name ?? slot.location_id}` })
                setPicked(new Set())
              }
            }
          )
        }
        onRemove={setRemoving}
      />

      <RemoveLocationDialog
        order={order?.order ?? ''}
        locations={locations ?? []}
        // Until the detail loads the packages are unknown, so the last location stays.
        hasPackages={data ? data.packages.length > 0 : true}
        location={removing}
        onOpenChange={open => !open && setRemoving(null)}
        onReplace={() => {
          setPicked(new Set())
          setPicking(true)
        }}
      />
    </Dialog>
  )
}
