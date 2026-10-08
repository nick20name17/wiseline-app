import { useBoard } from '../lib/board-context'
import { formatLongDate, today } from '@/lib/days'
import { useColumnOrder } from '@/components/table/column-order'
import { SpacerRows } from '@/components/table/spacer-rows'
import { useWindowRows } from '@/components/table/use-window-rows'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { QueryError } from '@/components/query-error'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { toggled } from '@/lib/sets'
import { useQuery } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { useState } from 'react'
import {
  isPartial,
  unscheduledOrdersQuery,
  useBypassProduction,
  useScheduleOrders,
  useSplitOrder,
  type BoardLineItem,
  type BoardOrder
} from '../api'
import { BypassDialog } from './bypass-dialog'
import { DayStrip } from './day-strip'
import { LineNotesDialog } from './line-notes-dialog'
import { OrderNoteDialog } from './order-note-dialog'
import { OrderRow } from './order-row'
import { ScheduleDialog } from './schedule-dialog'
import { StockCardsDialog } from './stock-cards-dialog'
import { onMachine, type MachineTab } from '../lib/machines'
import { StockOrderDialog } from './stock-order-dialog'
import { UnscheduledToolbar } from './unscheduled-toolbar'
import { useOrderNotes } from './use-line-note-state'

type UnscheduledTabProps = {
  search: string | undefined
  departmentId: number | undefined
  /** Rollforming's machine tab; none on a board without them. */
  machine?: MachineTab
}

/** The line items picked off one order, which is the board's Split Order. Only ever one order at a time. */
type Split = { orderId: string; lineIds: string[] }

type OpenDialog = 'schedule' | 'split' | 'bypass' | 'cards' | 'stock' | null

export const UnscheduledTab = ({ search, departmentId, machine }: UnscheduledTabProps) => {
  const board = useBoard()
  const {
    data: page,
    isPending,
    isError,
    error,
    refetch
  } = useQuery(unscheduledOrdersQuery(board.name, search))
  const columns = useColumnOrder(board.tables.unscheduled)
  const orders = onMachine(page?.results ?? [], machine)
  // Two hundred and more orders is too many rows to keep in the page at once; only those on screen are.
  const { tableRef, items, measure, before, after } = useWindowRows(
    orders.length,
    index => orders[index]?.id ?? String(index)
  )

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [split, setSplit] = useState<Split | null>(null)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [noteOrder, setNoteOrder] = useState<BoardOrder | null>(null)
  const [noteLine, setNoteLine] = useState<{ item: BoardLineItem; readOnly: boolean } | null>(null)

  // Asked once the list is whole, not again for every page as it streams in.
  const whole = !isPartial(page)
  const { notes, noteState } = useOrderNotes(whole ? orders : [])

  const scheduled = (productionDate: string) => () =>
    toast.add({ type: 'success', title: `Scheduled to ${formatLongDate(productionDate)}` })

  const schedule = useScheduleOrders(() => {
    setSelectedIds(new Set())
    setDialog(null)
  })
  const splitOrder = useSplitOrder(() => {
    setSplit(null)
    setDialog(null)
  })
  const bypass = useBypassProduction(() => {
    setSelectedIds(new Set())
    setDialog(null)
  })

  // The board counts only the rows on screen, so a search that hides a ticked order un-counts it.
  const selected = orders.filter(order => selectedIds.has(order.id))
  const splitting = split ? orders.find(order => order.id === split.orderId) : null

  const toggleLine = (orderId: string, lineId: string) =>
    setSplit(current => {
      const lineIds =
        current?.orderId === orderId ? [...toggled(new Set(current.lineIds), lineId)] : [lineId]
      return lineIds.length ? { orderId, lineIds } : null
    })

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-3.5'>
      <UnscheduledToolbar
        total={orders.length}
        selectedCount={selected.length}
        ready={departmentId !== undefined}
        onStockCards={() => setDialog('cards')}
        onCreateStockOrder={() => setDialog('stock')}
        onBypass={() => setDialog('bypass')}
        onSchedule={() => setDialog('schedule')}
      />

      <DayStrip departmentId={departmentId} />

      {isError && !page ? (
        <QueryError
          title='The unscheduled orders did not load'
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && whole && !orders.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>No unscheduled orders</EmptyTitle>
            <EmptyDescription>
              {search
                ? `Nothing matches “${search}”.`
                : 'New orders from EBMS land here. Create a stock order to add one manually.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          {/* The widths come from the layout rather than from the widest cell, so the columns hold
              still between the skeleton, the data and every search. */}
          <Table ref={tableRef} className='min-w-5xl table-fixed'>
            <colgroup>
              <col className='w-10' />
              {/* The cell's padding plus the 28px expand button, which the cell would clip. */}
              <col className='w-15' />
              {columns.cols}
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead />
                {columns.headers}
              </TableRow>
            </TableHeader>
            {isPending ? (
              <TableBody>
                <TableSkeletonRows columns={7} />
              </TableBody>
            ) : (
              <>
                <SpacerRows height={before} />
                {items.map(item => {
                  const order = orders[item.index]
                  if (!order) return null
                  return (
                    // One body per order, measured whole, so an order opened into its line items keeps
                    // the rows below it in place.
                    <tbody
                      key={item.key}
                      data-index={item.index}
                      ref={measure}
                      // The last order's rule would double the card's edge, which `TableBody` drops.
                      className={
                        item.index === orders.length - 1 ? '[&>tr:last-child]:border-0' : undefined
                      }
                    >
                      {/* The banding reads every other row by its place among its siblings; a hidden
                          row in front of every second order keeps the stripes where they were. */}
                      {item.index % 2 ? <tr hidden /> : null}
                      <OrderRow
                        order={order}
                        departmentId={departmentId}
                        expanded={expandedIds.has(order.id)}
                        selected={selectedIds.has(order.id)}
                        splitLineIds={split?.orderId === order.id ? split.lineIds : []}
                        splitting={!!split}
                        scheduling={selected.length > 0}
                        noteState={noteState(order)}
                        onToggleExpanded={() =>
                          setExpandedIds(current => toggled(current, order.id))
                        }
                        onToggleSelected={() =>
                          setSelectedIds(current => toggled(current, order.id))
                        }
                        onToggleLine={lineId => toggleLine(order.id, lineId)}
                        onSplit={() => setDialog('split')}
                        onOpenOrderNotes={() => setNoteOrder(order)}
                        onOpenLineNotes={(item, readOnly) => setNoteLine({ item, readOnly })}
                      />
                    </tbody>
                  )
                })}
                <SpacerRows height={after} />
              </>
            )}
          </Table>
        </div>
      )}

      <ScheduleDialog
        open={dialog === 'schedule'}
        onOpenChange={open => setDialog(open ? 'schedule' : null)}
        title={`Set ${board.dateLabel.toLowerCase()}`}
        description={`Scheduling ${selected.length} order${selected.length === 1 ? '' : 's'} entirely.`}
        actionLabel='Set date'
        departmentId={departmentId}
        isPending={schedule.isPending}
        onPick={productionDate =>
          departmentId &&
          schedule.mutate(
            { orders: selected, departmentId, productionDate },
            { onSuccess: scheduled(productionDate) }
          )
        }
      />

      <ScheduleDialog
        open={dialog === 'split'}
        onOpenChange={open => setDialog(open ? 'split' : null)}
        title={`Set ${board.dateLabel.toLowerCase()}`}
        description={
          splitting
            ? `Splitting ${split?.lineIds.length} of ${splitting.origin_items.length} line items from ${splitting.invoice} to a ${board.dateLabel.toLowerCase()}.`
            : ''
        }
        actionLabel='Set date'
        departmentId={departmentId}
        isPending={splitOrder.isPending}
        onPick={productionDate =>
          splitting &&
          split &&
          departmentId &&
          splitOrder.mutate(
            { order: splitting, departmentId, productionDate, originItems: split.lineIds },
            { onSuccess: scheduled(productionDate) }
          )
        }
      />

      <BypassDialog
        open={dialog === 'bypass'}
        onOpenChange={open => setDialog(open ? 'bypass' : null)}
        orders={selected}
        isPending={bypass.isPending}
        onConfirm={() => {
          if (!departmentId) return
          const count = selected.length
          bypass.mutate(
            { orders: selected, departmentId },
            {
              onSuccess: () =>
                toast.add({
                  type: 'success',
                  title: `Bypassed ${count} order${count === 1 ? '' : 's'} to Wrapping · Production Date ${formatLongDate(today())}`
                })
            }
          )
        }}
      />

      <StockCardsDialog
        open={dialog === 'cards'}
        onOpenChange={open => setDialog(open ? 'cards' : null)}
      />
      <StockOrderDialog
        open={dialog === 'stock'}
        onOpenChange={open => setDialog(open ? 'stock' : null)}
      />

      <OrderNoteDialog
        order={noteOrder}
        notes={notes}
        onOpenChange={open => !open && setNoteOrder(null)}
      />
      <LineNotesDialog
        originItem={noteLine?.item.id ?? null}
        productId={noteLine?.item.id_inven ?? ''}
        readOnly={noteLine?.readOnly}
        onOpenChange={open => !open && setNoteLine(null)}
      />
    </div>
  )
}
