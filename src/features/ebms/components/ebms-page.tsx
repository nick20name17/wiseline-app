import { ConfirmDialog } from '@/components/confirm-dialog'
import { EBMS_WAITING } from '@/components/ebms-sync-note'
import { QueryError } from '@/components/query-error'
import { TabCount } from '@/components/tab-count'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { useColumnOrder, type ColumnTable } from '@/components/table/column-order'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { formatDate, formatStamp } from '@/lib/days'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { TablePagination } from '@/components/table-pagination'
import { lastPage, usePage } from '@/lib/use-page'
import { CloudCheck } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  OUTBOX_PAGE,
  outboxCountQuery,
  outboxQuery,
  useRetryWrite,
  type OutboxStatus,
  type OutboxWrite
} from '../api'

const TABS: { status: OutboxStatus; label: string; empty: string }[] = [
  { status: 'failed', label: 'Failed', empty: 'EBMS has refused nothing that is still waiting.' },
  { status: 'queued', label: 'Queued', empty: 'Nothing is waiting for EBMS to answer.' },
  { status: 'ok', label: 'Sent', empty: 'Nothing has had to wait for EBMS yet.' }
]

const COLUMNS: ColumnTable = {
  table: 'ebms-outbox',
  columns: [
    { key: 'when', label: 'When', width: 'w-44', align: 'start' },
    { key: 'what', label: 'What', width: 'w-44', card: 'title' },
    { key: 'subject', label: 'Order or coil', width: 'w-56' },
    { key: 'by', label: 'By', width: 'w-36' },
    { key: 'attempts', label: 'Tries', width: 'w-20' },
    { key: 'state', label: 'EBMS', align: 'start', card: 'full' }
  ]
}

const FEET = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** What went to EBMS, as the person who did it would say it. */
const describe = (write: OutboxWrite) => {
  const { SHIP_DATE: shipDate, LOT_COUNT: feet } = write.body
  switch (write.kind) {
    case 'order_complete':
      return 'Order Complete'
    case 'ship_date':
      return typeof shipDate === 'string' ? `Ship Date ${formatDate(shipDate)}` : 'Ship Date'
    case 'coil_adjust':
      return typeof feet === 'number' ? `Linear Feet to ${FEET.format(feet)}` : 'Linear Feet'
    case 'coil_deplete':
      return 'Coil depleted'
    default:
      return write.kind
  }
}

/** The order by the number the floor uses, or the coil by its lot and what it is. */
const subject = (write: OutboxWrite) => {
  if (write.lot_autoid) {
    const { coil } = write
    const facts = coil
      ? [
          coil.color,
          coil.gauge === null ? null : `${coil.gauge} ga`,
          coil.width === null ? null : `${coil.width}"`
        ]
          .filter(Boolean)
          .join(' · ')
      : ''
    return (
      <span className='flex min-w-0 flex-col'>
        <span className='font-mono'>Lot {write.lot_number ?? write.lot_autoid}</span>
        {facts ? <span className='truncate text-xs text-muted-foreground'>{facts}</span> : null}
      </span>
    )
  }
  const order = write.order_number ?? write.order
  return order ? <span className='font-mono'>{order}</span> : null
}

const state = (write: OutboxWrite) =>
  write.status === 'failed' ? (
    <span className='whitespace-normal text-destructive'>{write.last_error ?? 'Refused'}</span>
  ) : write.status === 'queued' ? (
    <span className='text-warning'>Next try {formatStamp(write.next_attempt_at)}</span>
  ) : (
    <span className='text-muted-foreground'>Sent {formatStamp(write.sent_at)}</span>
  )

type EbmsPageProps = {
  status: OutboxStatus
  onStatusChange: (status: OutboxStatus) => void
}

/**
 * The app's writes that had to wait for EBMS: the ones it refused, which need a person to fix what it
 * objected to and send them again; the ones still waiting for it to answer; and the ones sent since.
 */
export const EbmsPage = ({ status, onStatusChange }: EbmsPageProps) => {
  const counts = {
    failed: useQuery(outboxCountQuery('failed')).data,
    queued: useQuery(outboxCountQuery('queued')).data,
    ok: useQuery(outboxCountQuery('ok')).data
  }
  const tableBox = useRef<HTMLDivElement>(null)
  const [page, setPage] = usePage(status)
  const { data, isPending, error, refetch, isPlaceholderData } = useQuery(outboxQuery(status, page))
  const writes = data?.results ?? []
  const count = data?.count ?? 0
  // A write sent again leaves the tab: past the end, the last page there is shows.
  if (data && !isPlaceholderData && page > lastPage(count, OUTBOX_PAGE))
    setPage(lastPage(count, OUTBOX_PAGE))
  const columns = useColumnOrder(COLUMNS)
  const tab = TABS.find(entry => entry.status === status)!

  const [asking, setAsking] = useState<OutboxWrite | null>(null)
  const [shown, release] = useRetained(asking)
  const retry = useRetryWrite()

  return (
    <section className='flex flex-1 flex-col gap-4 lg:min-h-0'>
      <Tabs value={status} onValueChange={value => onStatusChange(value as OutboxStatus)}>
        <TabsList variant='line' className='h-9'>
          {TABS.map(entry => (
            <TabsTrigger key={entry.status} value={entry.status}>
              {entry.label}
              <TabCount count={counts[entry.status]} active={entry.status === status} />
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && !data ? (
        <QueryError
          title='The EBMS queue did not load'
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && !writes.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <CloudCheck />
            </EmptyMedia>
            <EmptyTitle>Nothing {tab.label.toLowerCase()}</EmptyTitle>
            <EmptyDescription>{tab.empty}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          ref={tableBox}
          data-page-table
          className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'
        >
          <Table data-cards className='min-w-4xl table-fixed'>
            <colgroup>
              {columns.cols}
              {status === 'failed' ? <col className='w-32' /> : null}
            </colgroup>
            <TableHeader>
              <TableRow>
                {columns.headers}
                {status === 'failed' ? (
                  <TableHead>
                    <span className='sr-only'>Actions</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows actions={status === 'failed'} />
              ) : (
                writes.map(write => (
                  <TableRow key={write.id}>
                    {columns.cells({
                      when: <TableCell>{formatStamp(write.created_at)}</TableCell>,
                      what: <TableCell>{describe(write)}</TableCell>,
                      subject: <TableCell>{subject(write)}</TableCell>,
                      by: <TableCell>{write.created_by}</TableCell>,
                      attempts: (
                        <TableCell>
                          <span className='font-mono'>{write.attempts}</span>
                        </TableCell>
                      ),
                      state: <TableCell>{state(write)}</TableCell>
                    })}
                    {status === 'failed' ? (
                      <TableCell card='trail'>
                        <Button variant='outline' size='sm' onClick={() => setAsking(write)}>
                          Send again
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <TablePagination
        page={page}
        pageSize={OUTBOX_PAGE}
        count={count}
        pending={isPlaceholderData}
        onPageChange={setPage}
        table={tableBox}
      />

      <ConfirmDialog
        open={!!asking}
        onOpenChange={open => !open && setAsking(null)}
        onOpenChangeComplete={release}
        title='Send to EBMS again?'
        description={
          shown
            ? `EBMS refused ${describe(shown)} of ${shown.lot_number ? `lot ${shown.lot_number}` : `order ${shown.order_number ?? shown.order}`}${shown.last_error ? `: ${shown.last_error}` : '.'} Send it again once that is fixed in EBMS.`
            : ''
        }
        confirmLabel='Send again'
        cancelLabel='Cancel'
        isPending={retry.isPending}
        onConfirm={() =>
          asking &&
          retry.mutate(asking.id, {
            onSuccess: write => {
              setAsking(null)
              toast.add(
                write.status === 'ok'
                  ? { type: 'success', title: 'Sent to EBMS' }
                  : write.status === 'queued'
                    ? { type: 'warning', title: 'Waiting for EBMS', description: EBMS_WAITING }
                    : {
                        type: 'error',
                        title: 'EBMS refused it again',
                        description: write.last_error ?? undefined
                      }
              )
            }
          })
        }
      />
    </section>
  )
}
