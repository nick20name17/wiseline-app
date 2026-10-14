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
} from '@/components/dialog'
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
  jobLocationsQuery,
  orderLocationsQuery,
  remanufacturingsQuery,
  useAddJobLocation,
  useBoardDepartment,
  useMoveOrderPackages,
  useReprintPackage,
  type CompletedDetail,
  type CompletedOrder,
  type OrderLocation
} from '../api'
import { COMPLETED_PACKAGES_TABLE, withoutStock } from '../lib/columns'
import { formatStamp } from '../lib/format'
import { packageContents, remanTotal, type HeldLocation } from '../lib/wrapping'
import {
  LocationChips,
  LocationDialog,
  RemoveJobLocationDialog,
  RemoveLocationDialog
} from './location-dialog'
import { reprintLabel } from '../lib/package-label'
import { usePackageLabel } from './use-package-label'

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
        <Table data-cards>
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
  /** Ticked packages are the ones Add location moves; none where the locations are the job's. */
  picking?: { picked: ReadonlySet<number>; onChange: (picked: ReadonlySet<number>) => void }
}

/** The packages that carried the order out, each with a label the shop can print again. */
const PackagesSection = ({ packages, lines, picking }: PackagesSectionProps) => {
  const reprint = useReprintPackage()
  const label = usePackageLabel()
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
          <Table data-cards>
            <TableHeader>
              <TableRow>
                {picking ? (
                  <TableHead className='w-10'>
                    <Checkbox
                      aria-label='Move every package'
                      checked={packages.every(parcel => picking.picked.has(parcel.package_id))}
                      disabled={viewOnly}
                      onCheckedChange={checked =>
                        picking.onChange(
                          new Set(checked ? packages.map(parcel => parcel.package_id) : [])
                        )
                      }
                    />
                  </TableHead>
                ) : null}
                {columns.headers}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map(parcel => (
                <TableRow key={parcel.package_id}>
                  {picking ? (
                    <TableCell card='lead'>
                      <Checkbox
                        aria-label={`Move package ${parcel.name ?? parcel.package_id}`}
                        checked={picking.picked.has(parcel.package_id)}
                        disabled={viewOnly}
                        onCheckedChange={() =>
                          picking.onChange(toggled(picking.picked, parcel.package_id))
                        }
                      />
                    </TableCell>
                  ) : null}
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
                  <TableCell card='full'>
                    {viewOnly ? null : (
                      <span className='flex justify-end'>
                        <Button
                          variant='outline'
                          disabled={reprint.isPending}
                          title='Reprint this package label'
                          onClick={() =>
                            reprint.mutate(parcel.package_id, {
                              onSuccess: data => label.print(reprintLabel(data, names))
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
      {label.sheet}
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
  const { data: department } = useBoardDepartment(board.code)
  // Trim keeps its locations on the job: one is added beside the others and removed on its own.
  const jobMode = !!department?.job_locations
  // "reprint package labels and change/add/remove locations if necessary" — an order that has gone
  // still has to be findable, and a location freed when it is no longer standing there.
  const { data: locations } = useQuery(orderLocationsQuery(jobMode ? null : (order?.order ?? null)))
  const { data: jobLocations } = useQuery(
    jobLocationsQuery(departmentId, jobMode ? (order?.order ?? null) : null)
  )
  const [removing, setRemoving] = useState<OrderLocation | null>(null)
  const [removingJob, setRemovingJob] = useState<HeldLocation | null>(null)
  // Adding puts the ticked packages on a location; replacing — the last one taken off — moves all.
  const [picking, setPicking] = useState<'add' | 'replace' | null>(null)
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set())
  const move = useMoveOrderPackages()
  const addJob = useAddJobLocation()
  const viewOnly = useViewOnly()

  // A stock order is what is being manufactured, so nothing on it came off the shelf.
  const isStock = !!(data?.is_stock ?? order?.is_stock)
  const number = order?.order_number ?? order?.order ?? ''

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
      {/* Wide enough for the line items' every column without scrolling sideways on a desk. */}
      <DialogContent className='sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>{order ? titleOf(order, isStock) : 'Completed order'}</DialogTitle>
          <DialogDescription>
            Line items with stock taken, plus what went into each package.
          </DialogDescription>
        </DialogHeader>

        {/* A phone's drawer scrolls as one; a box scrolling inside it would fight the swipe. */}
        <div className='scrollport flex min-h-56 flex-col gap-4 md:max-h-104 md:overflow-y-auto'>
          {isPending || !data ? (
            <Skeleton className='h-56' />
          ) : (
            <>
              <LineItemsSection departmentId={departmentId} detail={data} isStock={isStock} />

              <PackagesSection
                packages={data.packages}
                lines={data.line_items}
                picking={jobMode ? undefined : { picked, onChange: setPicked }}
              />

              <section className='flex flex-wrap items-center gap-2'>
                <h3 className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                  {board.name} location
                </h3>
                {jobMode ? (
                  jobLocations?.length ? (
                    <LocationChips locations={jobLocations} onRemove={setRemovingJob} />
                  ) : (
                    <span className='text-sm text-muted-foreground'>None</span>
                  )
                ) : locations?.length ? (
                  <LocationChips locations={locations} onRemove={setRemoving} />
                ) : (
                  <span className='text-sm text-muted-foreground'>None</span>
                )}
                {/* p1 (912,576): a location is added, never swapped for the others. A package
                    stands in one place, so outside a job it is the ticked packages that go there. */}
                {viewOnly ? null : (
                  <Button
                    variant='outline'
                    className='ml-auto'
                    disabled={jobMode ? addJob.isPending : !picked.size}
                    title={
                      jobMode || picked.size
                        ? undefined
                        : 'Tick the packages that go on the new location'
                    }
                    onClick={() => setPicking('add')}
                  >
                    <MapPin data-icon='inline-start' />
                    {jobMode || !picked.size
                      ? 'Add location'
                      : `Move ${picked.size} package${picked.size === 1 ? '' : 's'}`}
                  </Button>
                )}
                {/* The reason is the button's hover title on a desk; a touch screen has no hover. */}
                {viewOnly || jobMode || picked.size || !data.packages.length ? null : (
                  <span className='hidden w-full text-right text-xs text-muted-foreground pointer-coarse:block'>
                    Tick the packages that go on the new location
                  </span>
                )}
              </section>

              <Facts detail={data} isStock={isStock} />

              <p className='text-center text-sm text-muted-foreground'>
                {data.completed_at
                  ? `Completed ${formatStamp(data.completed_at)}`
                  : order?.status === 'rolled'
                    ? order.complete_error
                      ? `EBMS refused: ${order.complete_error}`
                      : 'Done — completes once Wrapping gives every package a location'
                    : 'Completion time not recorded'}
              </p>
            </>
          )}
        </div>
      </DialogContent>

      {jobMode ? (
        <LocationDialog
          departmentId={departmentId}
          order={order?.order ?? null}
          orderNumber={number}
          orderLocations={jobLocations ?? []}
          stagedWeight={0}
          job
          open={!!picking}
          onOpenChange={open => !open && setPicking(null)}
          onPick={slot =>
            order &&
            departmentId !== undefined &&
            addJob.mutate(
              { order: order.order, departmentId, locationId: slot.location_id },
              {
                onSuccess: () =>
                  toast.add({ type: 'success', title: `Added ${slot.name ?? slot.location_id}` })
              }
            )
          }
          onRemove={setRemovingJob}
        />
      ) : (
        <LocationDialog
          departmentId={departmentId}
          order={order?.order ?? null}
          orderNumber={number}
          orderLocations={locations ?? []}
          stagedWeight={0}
          open={!!picking}
          onOpenChange={open => !open && setPicking(null)}
          onPick={slot =>
            order &&
            move.mutate(
              {
                order: order.order,
                locationId: slot.location_id,
                ...(picking === 'add' ? { packageIds: [...picked] } : {})
              },
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
      )}

      <RemoveLocationDialog
        order={order?.order ?? ''}
        locations={locations ?? []}
        // Until the detail loads the packages are unknown, so the last location stays.
        hasPackages={data ? data.packages.length > 0 : true}
        location={removing}
        onOpenChange={open => !open && setRemoving(null)}
        onReplace={() => {
          setPicked(new Set())
          setPicking('replace')
        }}
      />

      <RemoveJobLocationDialog
        order={order?.order ?? ''}
        departmentId={departmentId}
        location={removingJob}
        onOpenChange={open => !open && setRemovingJob(null)}
      />
    </Dialog>
  )
}
