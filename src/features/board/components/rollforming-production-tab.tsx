import { Description } from '@/components/description'
import { QueryError } from '@/components/query-error'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useColumnOrder } from '@/components/table/column-order'
import { byDay, formatDate, formatLongDate, today } from '@/lib/days'
import { useQuery } from '@tanstack/react-query'
import { Disc3, Factory, Scissors } from 'lucide-react'
import { cn } from 'cn'
import { ExpandButton } from '@/components/expand-button'
import { Fragment, useState } from 'react'
import {
  currentCoilQuery,
  departmentStateOf,
  isPartial,
  releasedOrdersQuery,
  wrappingRowsQuery,
  type BoardLineItem
} from '../api'
import { useBoard } from '../lib/board-context'
import { ROLLFORMING_PART_LINES_TABLE, ROLLFORMING_PRODUCTION_TABLE } from '../lib/columns'
import { materialsOf, partKey, partLines } from '../lib/parts'
import {
  coilNumbersOf,
  isStockLine,
  productionParts,
  runsOffCoil,
  sourceOf
} from '../lib/rollforming'
import { itemStatus, orderStatus } from '@/lib/status'
import { CoilLock } from './coil-lock'
import { CurrentCoil } from './current-coil'
import { PriorityPill } from '@/components/priority-pill'
import { StatusPill } from '@/components/status-pill'
import { WrapOrder } from './wrap-order'
import { CoilName } from './coil-name'

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

type CoilProps = { value: string | null; item: BoardLineItem['item']; mono?: boolean }

/**
 * A line's Supplier or Coil Number: «waiting...» while the Slit Line owes it, locked while it is the
 * Manager's or the Slit Line's to fill p2 (1051,333).
 */
const Coil = ({ value, item, mono = false }: CoilProps) => (
  <span className='inline-flex items-center gap-1.5'>
    <span className={cn('truncate', mono && 'font-mono')}>
      <CoilName value={value} waiting={item?.coil_icon === 'waiting_to_slit'} />
    </span>
    <CoilLock locked={item?.coil_fields_locked ?? false} />
  </span>
)

const PartLines = ({ lines }: { lines: BoardLineItem[] }) => {
  const columns = useColumnOrder(ROLLFORMING_PART_LINES_TABLE)

  return (
    <div className='border-l-2 border-primary/40 bg-muted/30 px-3 py-3'>
      <div className='overflow-hidden rounded-lg border border-border bg-card'>
        <Table data-cards className='table-fixed'>
          <colgroup>{columns.cols}</colgroup>
          <TableHeader>
            <TableRow>{columns.headers}</TableRow>
          </TableHeader>
          <TableBody>
            {lines.map(line => {
              const stock = isStockLine(line)
              return (
                <TableRow key={line.id}>
                  {columns.cells({
                    qty: (
                      <TableCell>
                        <span className='font-mono'>{line.quantity}</span>
                      </TableCell>
                    ),
                    desc: (
                      <TableCell>
                        <Description text={line.item?.description ?? line.description} />
                      </TableCell>
                    ),
                    l: (
                      <TableCell>
                        <span className='font-mono'>
                          {line.length === null ? '—' : `${line.length}"`}
                        </span>
                      </TableCell>
                    ),
                    status: (
                      <TableCell>
                        <StatusPill status={itemStatus(line.item?.status ?? null)} />
                      </TableCell>
                    ),
                    supplier: (
                      <TableCell>
                        {stock ? (
                          '—'
                        ) : (
                          <Coil value={line.item?.supplier ?? null} item={line.item} />
                        )}
                      </TableCell>
                    ),
                    coil: (
                      <TableCell>
                        {stock ? (
                          '—'
                        ) : (
                          <Coil value={line.item?.coil_number ?? null} item={line.item} mono />
                        )}
                      </TableCell>
                    ),
                    source: (
                      <TableCell>
                        <Source icon={stock ? null : (line.item?.coil_icon ?? null)} />
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/**
 * A Rollforming machine's Production tab p2 (1007,312): the orders released to it and not yet done,
 * by Production Date with the days apart — one list, the same for the Manager and the Worker
 * p2 (1045,276), (540,715). An order opens onto the bench where its packages are made p2 (1011,367);
 * once Left To Package is all zeros it is Rolled and leaves the list p2 (1041,510).
 */
export const RollformingProductionTab = (props: RollformingProductionTabProps) => (
  <div className='flex flex-col gap-3 lg:min-h-0'>
    <CurrentCoil machineId={props.machineId} />
    <ReleasedParts {...props} />
  </div>
)

const ReleasedParts = ({ search, departmentId, machineId }: RollformingProductionTabProps) => {
  const board = useBoard()
  const {
    data: page,
    isPending,
    isError,
    error,
    refetch
  } = useQuery(releasedOrdersQuery(board.name, search, true))
  const { data: coil } = useQuery(currentCoilQuery(machineId))
  // One order open at a time: opening another folds the last.
  const [expanded, setExpanded] = useState<string | null>(null)
  const [packing, setPacking] = useState<string | null>(null)
  // Only the bench reads the Wrapping rows, so they are fetched once an order is opened.
  const { data: benchRows } = useQuery({
    ...wrappingRowsQuery(departmentId, null),
    enabled: departmentId !== undefined && packing !== null
  })
  const parts =
    machineId === undefined ? [] : productionParts(page?.results ?? [], machineId, departmentId)
  const days = byDay(parts, part => part.day)
  const columns = useColumnOrder(ROLLFORMING_PRODUCTION_TABLE)

  const bench = parts.find(part => partKey(part.order.id, part.day) === packing)
  if (bench) {
    // The bench takes the part's every line, the ones already rolled included, so its figures add up.
    const lines = partLines(bench.order, bench.day)
    const ids = new Set(lines.map(line => line.id))
    const rows = (benchRows ?? []).filter(row => ids.has(row.origin_item))
    const coils = new Map(lines.flatMap(line => (line.item ? [[line.id, line.item] as const] : [])))
    if (rows.length)
      return (
        <WrapOrder
          departmentId={departmentId}
          rows={rows}
          coils={coils}
          onBack={() => setPacking(null)}
        />
      )
  }

  if (isError && !page)
    return (
      <QueryError
        title='The released orders did not load'
        error={error}
        onRetry={() => void refetch()}
      />
    )

  if (!isPending && !isPartial(page) && !parts.length)
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
    <div
      data-page-table
      className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'
    >
      <Table data-cards className='min-w-400 table-fixed'>
        <colgroup>
          <col className='w-10' />
          {columns.cols}
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead />
            {columns.headers}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows />
          ) : (
            days.map(day => (
              <Fragment key={day.date}>
                <TableRow data-divider>
                  <TableCell colSpan={1 + columns.order.length}>
                    <span className='text-xs font-semibold tracking-wider uppercase'>
                      {formatLongDate(day.date)}
                      {day.date === today() ? ' · today' : ''}
                    </span>
                  </TableCell>
                </TableRow>
                {day.items.map(({ order, day: date, lines }) => {
                  const key = partKey(order.id, date)
                  const open = expanded === key
                  const state = departmentStateOf(order, departmentId)
                  const profiles = [...new Set(lines.map(line => line.profile).filter(Boolean))]
                  const onCoil = runsOffCoil(lines, coil)
                  return (
                    <Fragment key={key}>
                      {/* The row opens the order's bench, where it is packaged; the chevron only
                          shows its lines. */}
                      <TableRow
                        aria-label={`Package ${order.invoice}`}
                        title='Open to package'
                        data-overdue={lines.some(line => line.item?.over_due) || undefined}
                        onClick={() => setPacking(key)}
                      >
                        <TableCell card='trail' onClick={event => event.stopPropagation()}>
                          <ExpandButton
                            label={`${open ? 'Collapse' : 'Expand'} ${order.invoice}`}
                            expanded={open}
                            onToggle={() => setExpanded(open ? null : key)}
                          />
                        </TableCell>
                        {columns.cells({
                          date: <TableCell>{formatDate(date)}</TableCell>,
                          order: (
                            <TableCell>
                              <span className='flex items-center gap-1.5'>
                                <span className='font-mono font-medium'>{order.invoice}</span>
                                {onCoil ? (
                                  <Disc3
                                    className='size-3.5 shrink-0 text-primary'
                                    aria-label='Runs off the coil in the machine'
                                  />
                                ) : null}
                              </span>
                            </TableCell>
                          ),
                          customer: (
                            <TableCell>
                              <span className='truncate'>{order.customer ?? '—'}</span>
                            </TableCell>
                          ),
                          po: (
                            <TableCell>
                              <span className='truncate'>{order.po_no ?? '—'}</span>
                            </TableCell>
                          ),
                          material: (
                            <TableCell>
                              <span className='truncate'>
                                {materialsOf({
                                  ...order,
                                  origin_items: lines
                                }).join(', ') || '—'}
                              </span>
                            </TableCell>
                          ),
                          profile: (
                            <TableCell>
                              <span className='truncate'>{profiles.join(' / ') || '—'}</span>
                            </TableCell>
                          ),
                          salesman: (
                            <TableCell>
                              <span className='truncate'>{order.salesman ?? '—'}</span>
                            </TableCell>
                          ),
                          priority: (
                            <TableCell>
                              {state?.priority ? (
                                <PriorityPill priority={state.priority} />
                              ) : (
                                <span className='text-muted-foreground'>—</span>
                              )}
                            </TableCell>
                          ),
                          status: (
                            <TableCell>
                              <StatusPill status={orderStatus(state?.status ?? null)} />
                            </TableCell>
                          ),
                          location: (
                            <TableCell>
                              <span className='truncate font-mono'>
                                {order.locations.join(', ') || '—'}
                              </span>
                            </TableCell>
                          ),
                          coil: (
                            <TableCell>
                              <span className='flex items-center gap-1.5'>
                                <span
                                  className={cn(
                                    'truncate font-mono',
                                    onCoil && 'font-medium text-primary'
                                  )}
                                >
                                  {coilNumbersOf(lines).join(', ') || '—'}
                                </span>
                              </span>
                            </TableCell>
                          ),
                          source: (
                            <TableCell>
                              <Source icon={sourceOf(lines)} />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                      {open ? (
                        <TableRow>
                          <TableCell colSpan={1 + columns.order.length}>
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
