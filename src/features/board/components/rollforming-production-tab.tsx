import { QueryError } from '@/components/query-error'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { byDay, formatDate, formatLongDate, today } from '@/lib/days'
import { toggled } from '@/lib/sets'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Disc3, Factory, Scissors } from 'lucide-react'
import { cn } from 'cn'
import { Fragment, useState } from 'react'
import { departmentStateOf, releasedOrdersQuery, type BoardLineItem } from '../api'
import { useBoard } from '../lib/board-context'
import { materialsOf, partKey } from '../lib/parts'
import { coilNumbersOf, productionParts } from '../lib/rollforming'
import { itemStatus, orderStatus } from '../lib/status'
import { PriorityPill } from './priority-pill'
import { StatusPill } from './status-pill'

const COLUMNS = 12

type RollformingProductionTabProps = {
  search: string | undefined
  departmentId: number | undefined
  machineId: number | undefined
}

/** Where a line's coil comes from: an existing coil, or the Slit Line, still waiting or done. */
const Source = ({ icon }: { icon: string | null }) =>
  icon === 'waiting_to_slit' ? (
    <Scissors className='size-3.5 text-warning' aria-label='Waiting for the Slit Line' />
  ) : icon === 'slit' ? (
    <Scissors className='size-3.5 text-success' aria-label='Slit' />
  ) : icon === 'coil' ? (
    <Disc3 className='size-3.5 text-muted-foreground' aria-label='From a coil' />
  ) : null

const PartLines = ({ lines }: { lines: BoardLineItem[] }) => (
  <div className='border-l-2 border-primary/40 bg-muted/30 px-3 py-3'>
    <div className='overflow-hidden rounded-lg border border-border bg-card'>
      <Table className='table-fixed'>
        <colgroup>
          <col className='w-16' />
          <col className='w-32' />
          <col />
          <col className='w-20' />
          <col className='w-32' />
          <col className='w-36' />
          <col className='w-36' />
          <col className='w-16' />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Qty</TableHead>
            <TableHead>Product ID</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>L&quot;</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Coil Number</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map(line => (
            <TableRow key={line.id}>
              <TableCell>
                <span className='font-mono'>{line.quantity}</span>
              </TableCell>
              <TableCell>
                <span className='font-mono'>{line.id_inven ?? '—'}</span>
              </TableCell>
              <TableCell>
                <span className='truncate text-muted-foreground'>
                  {line.item?.description ?? line.description ?? '—'}
                </span>
              </TableCell>
              <TableCell>
                <span className='font-mono'>{line.length === null ? '—' : `${line.length}"`}</span>
              </TableCell>
              <TableCell>
                <StatusPill status={itemStatus(line.item?.status ?? null)} />
              </TableCell>
              <TableCell>
                <span className='truncate'>{line.item?.supplier ?? 'Undefined'}</span>
              </TableCell>
              <TableCell>
                <span className='truncate font-mono'>{line.item?.coil_number ?? 'Undefined'}</span>
              </TableCell>
              <TableCell>
                <Source icon={line.item?.coil_icon ?? null} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
)

/**
 * A Rollforming machine's Production tab p2 (1007,312): the orders released to it and not yet done,
 * by Production Date with the days apart — one list, the same for the Manager and the Worker
 * p2 (1045,276), (540,715). The packages are made at Wrapping until the board's machine bench lands
 * (backend R11).
 */
export const RollformingProductionTab = ({
  search,
  departmentId,
  machineId
}: RollformingProductionTabProps) => {
  const board = useBoard()
  const {
    data: page,
    isPending,
    isError,
    error,
    refetch
  } = useQuery(releasedOrdersQuery(board.name, search))
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const parts =
    machineId === undefined ? [] : productionParts(page?.results ?? [], machineId, departmentId)
  const days = byDay(parts, part => part.day)

  if (isError && !page)
    return (
      <QueryError
        title='The released orders did not load'
        error={error}
        onRetry={() => void refetch()}
      />
    )

  if (!isPending && !parts.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Factory />
          </EmptyMedia>
          <EmptyTitle>Nothing to roll</EmptyTitle>
          <EmptyDescription>
            {search
              ? 'No released order on this machine matches your search.'
              : 'Orders show here once the Manager releases them to production.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      <Table className='min-w-400 table-fixed'>
        <colgroup>
          <col className='w-10' />
          <col className='w-36' />
          <col className='w-24' />
          <col className='w-44' />
          <col className='w-28' />
          <col />
          <col className='w-32' />
          <col className='w-36' />
          <col className='w-28' />
          <col className='w-32' />
          <col className='w-28' />
          <col className='w-32' />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead />
            <TableHead>Production Date</TableHead>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>PO</TableHead>
            <TableHead>Gauge / Color</TableHead>
            <TableHead>Profile</TableHead>
            <TableHead>Salesman</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Coil Number</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows columns={COLUMNS} />
          ) : (
            days.map(day => (
              <Fragment key={day.date}>
                <TableRow data-divider>
                  <TableCell colSpan={COLUMNS}>
                    <span className='text-xs font-semibold tracking-wider uppercase'>
                      {formatLongDate(day.date)}
                      {day.date === today() ? ' · today' : ''}
                    </span>
                  </TableCell>
                </TableRow>
                {day.items.map(({ order, day: date, lines }) => {
                  const key = partKey(order.id, date)
                  const open = expanded.has(key)
                  const state = departmentStateOf(order, departmentId)
                  const profiles = [...new Set(lines.map(line => line.profile).filter(Boolean))]
                  return (
                    <Fragment key={key}>
                      <TableRow data-overdue={lines.some(line => line.item?.over_due) || undefined}>
                        <TableCell>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label={`${open ? 'Collapse' : 'Expand'} ${order.invoice}`}
                            aria-expanded={open}
                            onClick={() => setExpanded(current => toggled(current, key))}
                          >
                            <ChevronRight
                              className={cn('transition-transform', open && 'rotate-90')}
                            />
                          </Button>
                        </TableCell>
                        <TableCell>{formatDate(date)}</TableCell>
                        <TableCell>
                          <span className='font-mono font-medium'>{order.invoice}</span>
                        </TableCell>
                        <TableCell>
                          <span className='truncate'>{order.customer ?? '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className='truncate'>{order.po_no ?? '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className='truncate'>
                            {materialsOf({ ...order, origin_items: lines }).join(', ') || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className='truncate'>{profiles.join(' / ') || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className='truncate'>{order.salesman ?? '—'}</span>
                        </TableCell>
                        <TableCell>
                          {state?.priority ? (
                            <PriorityPill priority={state.priority} />
                          ) : (
                            <span className='text-muted-foreground'>—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill status={orderStatus(state?.status ?? null)} />
                        </TableCell>
                        <TableCell>
                          <span className='truncate font-mono'>
                            {order.locations.join(', ') || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className='truncate font-mono'>
                            {coilNumbersOf(lines).join(', ') || '—'}
                          </span>
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow>
                          <TableCell colSpan={COLUMNS}>
                            <PartLines lines={lines} />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  )
                })}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
