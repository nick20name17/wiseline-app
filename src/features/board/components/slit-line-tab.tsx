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
import { CalendarClock, Scissors } from 'lucide-react'
import { Fragment, useState } from 'react'
import { slitLineQuery, useScheduleSlit, useSlitRequest, type SlitStage } from '../api'
import { useViewOnly } from '../lib/board-context'
import { matchesSearch } from '../lib/search'
import { CoilAssignDialog } from './coil-assign-dialog'
import { LineNotesDialog } from './line-notes-dialog'
import { ScheduleDialog } from './schedule-dialog'
import { NoteButton } from '@/components/note-button'
import { useLineNoteState } from './use-line-note-state'

const COLUMNS = 10

const EMPTY: Record<SlitStage, [string, string]> = {
  unscheduled: [
    'Nothing to schedule',
    "A machine's request shows here until it is given a slit day."
  ],
  scheduled: ['Nothing scheduled', 'A request shows here once it has its day on the Slit Line.'],
  slit: ['Nothing slit yet', 'Material shows here once the Slit Line marks it slit.']
}

type SlitLineTabProps = { search: string | undefined; departmentId: number }

/**
 * The Slit Line: material a machine asked to have slit p2 (754,297). The Manager gives a request its
 * own slit day, whole — no Split p2 (761,308) — and it is read by that day then Priority p2 (1204,296).
 * Marking it slit records the Supplier and Coil Number used, and they fill into the line on the board,
 * its scissors turning green p2 (1086,349).
 */
export const SlitLineTab = ({ search, departmentId }: SlitLineTabProps) => {
  const [stage, setStage] = useState<SlitStage>('unscheduled')
  const done = stage === 'slit'
  const {
    data: queue,
    isPending,
    isError,
    error,
    refetch
  } = useQuery(slitLineQuery(departmentId, stage))
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [marking, setMarking] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const schedule = useScheduleSlit()
  const [noteItem, setNoteItem] = useState<string | null>(null)
  const cancel = useSlitRequest()
  const viewOnly = useViewOnly()

  const all = queue ?? []
  const rows = all.filter(row =>
    matchesSearch(search, row.order, row.invoice, row.product_id, row.description)
  )
  // Line notes are open «at any point in production» p2 (526,410), the Slit Line included.
  const noteState = useLineNoteState(rows.map(row => row.origin_item))
  const chosen = rows.filter(row => picked.has(row.origin_item))
  // Mark slit is one coil, so one Product ID p2 (540,467); a request is scheduled whole, products and all.
  const oneProduct = new Set(chosen.map(row => row.product_id)).size <= 1
  const days = byDay(rows, row =>
    stage === 'scheduled' ? row.slit_production_date : row.production_date
  )
  const [emptyTitle, emptyText] = EMPTY[stage]
  const setDay = (productionDate: string | null) =>
    schedule.mutate(
      { originItems: chosen.map(row => row.origin_item), productionDate },
      {
        onSuccess: () => {
          setScheduling(false)
          setPicked(new Set())
        }
      }
    )

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-3.5'>
      <div className='flex flex-wrap items-center gap-2.5'>
        <div className='border-b border-border'>
          <Tabs
            value={stage}
            onValueChange={value => {
              setStage(value as SlitStage)
              setPicked(new Set())
            }}
          >
            <TabsList variant='line' className='h-9'>
              <TabsTrigger value='unscheduled'>Unscheduled</TabsTrigger>
              <TabsTrigger value='scheduled'>Scheduled</TabsTrigger>
              <TabsTrigger value='slit'>Slit</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {done || viewOnly ? null : (
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
            <Button variant='outline' disabled={!chosen.length} onClick={() => setScheduling(true)}>
              <CalendarClock data-icon='inline-start' />
              {stage === 'scheduled' ? 'Reschedule' : 'Schedule'}
              {chosen.length ? ` (${chosen.length})` : ''}
            </Button>
            <Button
              disabled={!chosen.length || !oneProduct}
              title={oneProduct ? undefined : 'One Product ID at a time: it is slit off one coil'}
              onClick={() => setMarking(true)}
            >
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
            <EmptyTitle>{all.length ? 'No material matches' : emptyTitle}</EmptyTitle>
            <EmptyDescription>
              {all.length ? `Nothing on the Slit Line matches «${search?.trim()}».` : emptyText}
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
              <col className='w-32' />
              <col className='w-32' />
              <col />
              <col className='w-16' />
              <col className='w-36' />
              <col className='w-40' />
              <col className='w-16' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Production Date</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Product ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Coil Number</TableHead>
                <TableHead>Notes</TableHead>
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
                      const product = row.product_id
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
                                aria-label={`Select ${product ?? row.origin_item} of ${row.invoice ?? row.order}`}
                                checked={picked.has(row.origin_item)}
                                disabled={viewOnly}
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
                              {row.invoice ?? row.order ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className='truncate'>{row.requested_by ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>{product ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='truncate text-muted-foreground'>
                              {row.description ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className='font-mono'>{row.quantity ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='truncate'>{row.supplier ?? 'Undefined'}</span>
                          </TableCell>
                          <TableCell>
                            <span className='truncate font-mono'>
                              {row.coil_number ?? 'Undefined'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <NoteButton
                              state={noteState(row.origin_item)}
                              label={`Line notes for ${product ?? row.origin_item}`}
                              onClick={() => setNoteItem(row.origin_item)}
                            />
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
        departmentId={departmentId}
        lines={chosen.map(row => ({ id: row.origin_item, id_inven: row.product_id }))}
        open={marking}
        onOpenChange={setMarking}
        onAssigned={() => setPicked(new Set())}
      />

      <ScheduleDialog
        open={scheduling}
        onOpenChange={setScheduling}
        title='Slit Line day'
        description={`The day the Slit Line slits ${chosen.length === 1 ? 'this request' : `these ${chosen.length} lines`}.`}
        actionLabel='Schedule'
        departmentId={departmentId}
        initialDay={stage === 'scheduled' ? (chosen[0]?.slit_production_date ?? null) : null}
        isPending={schedule.isPending}
        onPick={setDay}
        onUnschedule={stage === 'scheduled' ? () => setDay(null) : undefined}
      />

      <LineNotesDialog
        originItem={noteItem}
        productId={rows.find(row => row.origin_item === noteItem)?.product_id ?? ''}
        onOpenChange={open => !open && setNoteItem(null)}
      />
    </div>
  )
}
