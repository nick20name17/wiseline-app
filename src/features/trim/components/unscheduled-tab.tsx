import { useColumnOrder } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { toggled } from '@/lib/sets'
import { useQuery } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { useState } from 'react'
import {
  isStockOrder,
  orderNotesQuery,
  unscheduledOrdersQuery,
  useBypassProduction,
  useScheduleOrders,
  useSplitOrder,
  type TrimLineItem,
  type TrimOrder
} from '../api'
import { UNSCHEDULED_TABLE } from '../lib/columns'
import { formatLongDate, today } from '../lib/format'
import { BypassDialog } from './bypass-dialog'
import { DayStrip } from './day-strip'
import { LineNotesDialog } from './line-notes-dialog'
import type { NoteState } from './note-button'
import { OrderNoteDialog } from './order-note-dialog'
import { OrderRow } from './order-row'
import { ScheduleDialog } from './schedule-dialog'
import { StockCardsDialog } from './stock-cards-dialog'
import { StockOrderDialog } from './stock-order-dialog'
import { UnscheduledToolbar } from './unscheduled-toolbar'

type UnscheduledTabProps = {
  search: string | undefined
  departmentId: number | undefined
}

/** The line items picked off one order, which is the board's Split Order. Only ever one order at a time. */
type Split = { orderId: string; lineIds: string[] }

type OpenDialog = 'schedule' | 'split' | 'bypass' | 'cards' | 'stock' | null

export const UnscheduledTab = ({ search, departmentId }: UnscheduledTabProps) => {
  const { data: page, isPending } = useQuery(unscheduledOrdersQuery(search))
  const columns = useColumnOrder(UNSCHEDULED_TABLE)
  const orders = page?.results ?? []

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [split, setSplit] = useState<Split | null>(null)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [noteOrder, setNoteOrder] = useState<TrimOrder | null>(null)
  const [noteLine, setNoteLine] = useState<{ item: TrimLineItem; readOnly: boolean } | null>(null)

  // Only EBMS orders carry a note; a stock order has no EBMS row to import one from.
  const noteOrderIds = orders.filter(order => !isStockOrder(order)).map(order => order.id)
  const { data: notes } = useQuery(orderNotesQuery(noteOrderIds))

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

  const noteState = (order: TrimOrder): NoteState => {
    const note = notes?.[order.id]
    if (!note?.has_note) return 'none'
    return note.read ? 'read' : 'unread'
  }

  const toggleLine = (orderId: string, lineId: string) =>
    setSplit(current => {
      const lineIds =
        current?.orderId === orderId ? [...toggled(new Set(current.lineIds), lineId)] : [lineId]
      return lineIds.length ? { orderId, lineIds } : null
    })

  return (
    <div className='flex min-w-0 flex-col gap-3.5'>
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

      {!isPending && !orders.length ? (
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
          <Table className='min-w-5xl table-fixed'>
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
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={7} />
              ) : (
                orders.map(order => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    departmentId={departmentId}
                    expanded={expandedIds.has(order.id)}
                    selected={selectedIds.has(order.id)}
                    splitLineIds={split?.orderId === order.id ? split.lineIds : []}
                    splitting={!!split}
                    scheduling={selected.length > 0}
                    noteState={noteState(order)}
                    onToggleExpanded={() => setExpandedIds(current => toggled(current, order.id))}
                    onToggleSelected={() => setSelectedIds(current => toggled(current, order.id))}
                    onToggleLine={lineId => toggleLine(order.id, lineId)}
                    onSplit={() => setDialog('split')}
                    onOpenOrderNotes={() => setNoteOrder(order)}
                    onOpenLineNotes={(item, readOnly) => setNoteLine({ item, readOnly })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ScheduleDialog
        open={dialog === 'schedule'}
        onOpenChange={open => setDialog(open ? 'schedule' : null)}
        title='Set production date'
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
        title='Set production date'
        description={
          splitting
            ? `Splitting ${split?.lineIds.length} of ${splitting.origin_items.length} line items from ${splitting.invoice} to a production date.`
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
