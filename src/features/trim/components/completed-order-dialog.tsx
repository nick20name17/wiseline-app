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
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { completedOrderQuery, useReprintPackage, type CompletedOrder } from '../api'
import { formatDate } from '../lib/format'

const stamp = (iso: string | null) => {
  if (!iso) return '—'
  const at = new Date(iso)
  return `${at.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })} · ${at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

type Fact = { label: string; value: string }

const Facts = ({ facts }: { facts: Fact[] }) => (
  <dl className='grid gap-x-8 gap-y-1 sm:grid-cols-2'>
    {facts.map(fact => (
      <div key={fact.label} className='flex items-baseline justify-between gap-4 text-sm'>
        <dt className='text-muted-foreground'>{fact.label}</dt>
        <dd className='font-medium'>{fact.value}</dd>
      </div>
    ))}
  </dl>
)

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
  order,
  onOpenChange
}: CompletedOrderDialogProps) => {
  const { data, isPending } = useQuery(completedOrderQuery(departmentId, order?.order ?? null))
  const reprint = useReprintPackage(() => toast.add({ type: 'success', title: 'Label sent' }))

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            Completed · {order?.order_number ?? ''} · {order?.customer ?? 'Stock'}
          </DialogTitle>
          <DialogDescription>
            Line items with the stock taken out of them, plus what went into each package.
          </DialogDescription>
        </DialogHeader>

        <div className='scrollport flex max-h-104 min-h-56 flex-col gap-4 overflow-y-auto'>
          {isPending || !data ? (
            <Skeleton className='h-56' />
          ) : (
            <>
              <section className='flex flex-col gap-2'>
                {/* What actually went to EBMS when the order was closed: ordered minus stock. */}
                <h3 className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                  Line items · manufacturing batch{' '}
                  {data.line_items.reduce(
                    (total, line) => total + Math.max(line.qty_ordered - line.from_stock, 0),
                    0
                  )}{' '}
                  pcs (qty − stock)
                </h3>
                <div className='overflow-hidden rounded-lg border border-border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product ID</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty Ordered</TableHead>
                        <TableHead>Stock Pulled</TableHead>
                        <TableHead>Manufactured</TableHead>
                        <TableHead>Packaged</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.line_items.map(line => (
                        <TableRow key={line.origin_item}>
                          <TableCell>
                            <span className='font-mono'>{line.product_id ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='text-muted-foreground'>{line.description ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>{line.qty_ordered}</span>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>{line.from_stock || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>
                              {Math.max(line.qty_ordered - line.from_stock, 0)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>{line.packaged}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <section className='flex flex-col gap-2'>
                <h3 className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                  Packages
                </h3>
                <div className='overflow-hidden rounded-lg border border-border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Package</TableHead>
                        <TableHead>Contents</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.packages.map(parcel => (
                        <TableRow key={parcel.package_id}>
                          <TableCell>
                            <span className='font-mono'>{parcel.name ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='text-muted-foreground'>
                              {parcel.contents
                                .map(item => `${item.quantity} × ${item.origin_item ?? '—'}`)
                                .join(', ') || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>{parcel.location ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='flex justify-end'>
                              <Button
                                variant='outline'
                                disabled={reprint.isPending}
                                onClick={() => reprint.mutate(parcel.package_id)}
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
              </section>

              <Facts
                facts={[
                  { label: 'Customer', value: order?.customer ?? 'Stock' },
                  { label: 'Ship date', value: formatDate(order?.ship_date ?? null) },
                  { label: 'Order #', value: order?.order_number ?? '—' },
                  { label: 'Production date', value: formatDate(order?.production_date ?? null) }
                ]}
              />

              <p className='text-center text-sm text-muted-foreground'>
                Completed {stamp(data.completed_at)}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
