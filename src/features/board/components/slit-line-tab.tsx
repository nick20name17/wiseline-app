import { byDay, formatDate, formatLongDate, today } from '@/lib/days'
import { QueryError } from '@/components/query-error'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { Scissors } from 'lucide-react'
import { Fragment, useState } from 'react'
import { scheduledOrdersQuery, slitLineQuery, useSlitRequest, type BoardLineItem } from '../api'
import { useBoard } from '../lib/board-context'
import { CoilAssignDialog } from './coil-assign-dialog'

const COLUMNS = 9

type SlitLineTabProps = { departmentId: number }

/**
 * The Slit Line: material the Manager sent to be slit, by Production Date then Priority p2 (1204,296).
 * Marking it slit records the Supplier and Coil Number used, and they fill into the line on the board,
 * its scissors turning green p2 (1086,349).
 */
export const SlitLineTab = ({ departmentId }: SlitLineTabProps) => {
  const board = useBoard()
  const [done, setDone] = useState(false)
  const {
    data: queue,
    isPending,
    isError,
    error,
    refetch
  } = useQuery(slitLineQuery(departmentId, done))
  // The Slit Line names a line by its autoid; the board's scheduled orders say what it is.
  const { data: orders } = useQuery(scheduledOrdersQuery(board.name, undefined))
  const lines = new Map<string, { invoice: string; customer: string | null; line: BoardLineItem }>(
    (orders?.results ?? []).flatMap(order =>
      order.origin_items.map(line => [
        line.id,
        { invoice: order.invoice, customer: order.customer, line }
      ])
    )
  )
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [marking, setMarking] = useState(false)
  const cancel = useSlitRequest()

  const rows = queue ?? []
  const chosen = rows.filter(row => picked.has(row.origin_item))
  // One coil at a time, so one Product ID at a time p2 (540,467).
  const chosenProduct = chosen.length ? lines.get(chosen[0]!.origin_item)?.line.id_inven : undefined
  const days = byDay(rows, row => row.production_date)

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-3.5'>
      <div className='flex flex-wrap items-center gap-2.5'>
        <div className='border-b border-border'>
          <Tabs
            value={done ? 'slit' : 'waiting'}
            onValueChange={value => {
              setDone(value === 'slit')
              setPicked(new Set())
            }}
          >
            <TabsList variant='line' className='h-9'>
              <TabsTrigger value='waiting'>Waiting</TabsTrigger>
              <TabsTrigger value='slit'>Slit</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {done ? null : (
          <span className='ml-auto flex gap-2'>
            <Button
              variant='outline'
              disabled={!chosen.length || cancel.isPending}
              onClick={() =>
                cancel.mutate(
                  { originItems: chosen.map(row => row.origin_item), slit: false },
                  { onSuccess: () => setPicked(new Set()) }
                )
              }
            >
              Take off the Slit Line
            </Button>
            <Button disabled={!chosen.length} onClick={() => setMarking(true)}>
              <Scissors data-icon='inline-start' />
              Mark slit{chosen.length ? ` (${chosen.length})` : ''}
            </Button>
          </span>
        )}
      </div>

      {isError && !queue ? (
        <QueryError
          title='The Slit Line did not load'
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && !rows.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Scissors />
            </EmptyMedia>
            <EmptyTitle>{done ? 'Nothing slit yet' : 'Nothing to slit'}</EmptyTitle>
            <EmptyDescription>
              {done
                ? 'Material shows here once the Slit Line marks it slit.'
                : 'Material shows here once a Manager sends it to the Slit Line.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table className='min-w-5xl table-fixed'>
            <colgroup>
              <col className='w-10' />
              <col className='w-36' />
              <col className='w-28' />
              <col className='w-48' />
              <col className='w-32' />
              <col />
              <col className='w-16' />
              <col className='w-36' />
              <col className='w-40' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Production Date</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Coil Number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={COLUMNS} />
              ) : (
                days.map(day => (
                  <Fragment key={day.date ?? 'undated'}>
                    <TableRow data-divider>
                      <TableCell colSpan={COLUMNS}>
                        <span className='text-xs font-semibold tracking-wider uppercase'>
                          {day.date ? formatLongDate(day.date) : '—'}
                          {day.date === today() ? ' · today' : ''}
                        </span>
                      </TableCell>
                    </TableRow>
                    {day.items.map(row => {
                      const known = lines.get(row.origin_item)
                      const product = known?.line.id_inven ?? null
                      const pickable = chosenProduct === undefined || chosenProduct === product
                      return (
                        <TableRow
                          key={row.origin_item}
                          data-state={picked.has(row.origin_item) ? 'selected' : undefined}
                        >
                          <TableCell>
                            {done ? (
                              <Scissors className='size-3.5 text-success' aria-label='Slit' />
                            ) : (
                              <Checkbox
                                aria-label={`Select ${product ?? row.origin_item} of ${known?.invoice ?? row.order}`}
                                checked={picked.has(row.origin_item)}
                                disabled={!pickable}
                                onCheckedChange={() =>
                                  setPicked(current => {
                                    const next = new Set(current)
                                    if (!next.delete(row.origin_item)) next.add(row.origin_item)
                                    return next
                                  })
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell>{formatDate(row.production_date)}</TableCell>
                          <TableCell>
                            <span className='font-mono font-medium'>
                              {known?.invoice ?? row.order ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className='truncate'>{known?.customer ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>{product ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='truncate text-muted-foreground'>
                              {known?.line.item?.description ?? known?.line.description ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>{known?.line.quantity ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='truncate'>{row.supplier ?? 'Undefined'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='truncate font-mono'>
                              {row.coil_number ?? 'Undefined'}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CoilAssignDialog
        action='slit'
        lines={chosen.map(row => ({
          id: row.origin_item,
          id_inven: lines.get(row.origin_item)?.line.id_inven ?? null
        }))}
        open={marking}
        onOpenChange={setMarking}
        onAssigned={() => setPicked(new Set())}
      />
    </div>
  )
}
