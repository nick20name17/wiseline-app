import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toggled } from '@/lib/sets'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, X } from 'lucide-react'
import { useState } from 'react'
import {
  loadsQuery,
  useAddToLoad,
  useReleaseLoad,
  useRemoveFromLoad,
  type Assignment,
  type TruckCard
} from '../api'
import { formatWeight } from '../lib/format'

const STATUS_LABEL: Record<string, string> = {
  unreleased: 'Unreleased',
  not_started: 'Not Started',
  loading: 'Loading',
  loaded: 'Loaded',
  en_route: 'En Route',
  delivered: 'Delivered',
  completed: 'Completed'
}

const statusLabel = (status: string | null) => (status ? (STATUS_LABEL[status] ?? status) : null)

const OrderLine = ({ order, children }: { order: Assignment; children?: React.ReactNode }) => (
  <li className='flex items-center gap-3 border-t border-border px-3 py-2 text-sm'>
    {children}
    <span className='w-28 font-mono font-medium'>{order.order_number ?? '—'}</span>
    <span className='min-w-0 flex-1 truncate'>{order.customer ?? '—'}</span>
    {order.kind === 'pickup' ? <Badge variant='muted'>Pickup</Badge> : null}
    <span className='w-28 text-right font-mono text-muted-foreground'>
      {formatWeight(order.weight)}
    </span>
    <span className='w-24 text-right text-xs text-muted-foreground'>
      {statusLabel(order.status) ?? ''}
    </span>
  </li>
)

type TruckLoadsProps = {
  card: TruckCard
  shipDate: string
}

/**
 * Under a truck: the orders not on a Load yet, ticked into the Load tab in view with Add To Load
 * p3 (591,357), and a tab per Load with its orders and Release To Loading p3 (598,468).
 */
export const TruckLoads = ({ card, shipDate }: TruckLoadsProps) => {
  const { data: loads, isPending } = useQuery(loadsQuery(card.truck_id, shipDate))
  const [tab, setTab] = useState<number | null>(null)
  const [picked, setPicked] = useState<Set<number>>(() => new Set())
  const add = useAddToLoad(() => setPicked(new Set()))
  const remove = useRemoveFromLoad()
  const release = useReleaseLoad()

  const waiting = card.orders.filter(order => order.load_id === null)
  const current = loads?.find(load => load.load_id === tab) ?? loads?.[0] ?? null
  const all = waiting.length > 0 && waiting.every(order => picked.has(order.assignment_id))
  const selectedWeight = waiting
    .filter(order => picked.has(order.assignment_id))
    .reduce((total, order) => total + order.weight, 0)

  if (isPending) return <Skeleton className='h-24' />

  return (
    <div className='flex flex-col gap-3 border-t border-border bg-muted/30 p-3'>
      {waiting.length ? (
        <section className='rounded-lg border border-border bg-card'>
          <div className='flex items-center gap-3 px-3 py-2'>
            {/* «Select All … the order that have not been assigned to a load» p3 (594,325). */}
            <Checkbox
              aria-label={`Select every order on truck ${card.name} not on a Load`}
              checked={all}
              onCheckedChange={() =>
                setPicked(all ? new Set() : new Set(waiting.map(order => order.assignment_id)))
              }
            />
            <span className='text-sm font-medium'>Not on a Load</span>
            <span className='text-sm text-muted-foreground'>
              Selected {formatWeight(selectedWeight)}
            </span>
            <Button
              className='ml-auto'
              disabled={!picked.size || !current || add.isPending}
              onClick={() =>
                current && add.mutate({ assignmentIds: [...picked], loadId: current.load_id })
              }
            >
              {add.isPending ? <Spinner data-icon='inline-start' /> : null}
              Add to {current?.name ?? 'Load'}
            </Button>
          </div>
          <ul>
            {waiting.map(order => (
              <OrderLine key={order.assignment_id} order={order}>
                <Checkbox
                  aria-label={`Select order ${order.order_number ?? order.assignment_id}`}
                  checked={picked.has(order.assignment_id)}
                  onCheckedChange={() => setPicked(set => toggled(set, order.assignment_id))}
                />
              </OrderLine>
            ))}
          </ul>
        </section>
      ) : null}

      {loads?.length ? (
        <section className='rounded-lg border border-border bg-card'>
          <Tabs value={String(current?.load_id)} onValueChange={value => setTab(Number(value))}>
            <div className='px-3'>
              <TabsList variant='line'>
                {loads.map(load => (
                  <TabsTrigger key={load.load_id} value={String(load.load_id)}>
                    {load.name}
                    <span className='ml-1 font-mono text-xs text-muted-foreground'>
                      {formatWeight(load.weight)}
                    </span>
                    {load.status ? (
                      <span className='ml-1 text-xs text-muted-foreground'>
                        · {statusLabel(load.status)}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          {current ? (
            <>
              {current.orders.length ? (
                <ul>
                  {current.orders.map(order => (
                    <OrderLine key={order.assignment_id} order={order}>
                      <span className='w-10 font-mono text-xs text-muted-foreground'>
                        {current.marker}
                      </span>
                    </OrderLine>
                  ))}
                </ul>
              ) : (
                <p className='px-3 py-4 text-sm text-muted-foreground'>
                  Tick orders above and add them to {current.name}.
                </p>
              )}
              {current.orders.length && (current.status ?? 'unreleased') === 'unreleased' ? (
                <div className='flex justify-end gap-2 border-t border-border px-3 py-2'>
                  <Button
                    variant='outline'
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(current.orders.map(order => order.assignment_id))}
                  >
                    <X data-icon='inline-start' />
                    Take all off {current.name}
                  </Button>
                  <Button
                    disabled={release.isPending}
                    onClick={() => release.mutate(current.load_id)}
                  >
                    {release.isPending ? (
                      <Spinner data-icon='inline-start' />
                    ) : (
                      <ArrowRight data-icon='inline-start' />
                    )}
                    Release to Loading
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
