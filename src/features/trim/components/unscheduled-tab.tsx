import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  readOnly: boolean
}

/** The line items picked off one order, which is the board's Split Order. Only ever one order at a time. */
type Split = { orderId: string; lineIds: string[] }

type OpenDialog = 'schedule' | 'split' | 'bypass' | 'cards' | 'stock' | null

const toggle = (current: Set<string>, id: string) => {
  const next = new Set(current)
  if (!next.delete(id)) next.add(id)
  return next
}

export const UnscheduledTab = ({ search, departmentId, readOnly }: UnscheduledTabProps) => {
  const { data: page, isPending } = useQuery(unscheduledOrdersQuery(search))
  const orders = page?.results ?? []

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [split, setSplit] = useState<Split | null>(null)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [noteOrder, setNoteOrder] = useState<TrimOrder | null>(null)
  const [noteLine, setNoteLine] = useState<TrimLineItem | null>(null)

  // Only EBMS orders carry a note; a stock order has no EBMS row to import one from.
  const noteOrderIds = orders.filter(order => !isStockOrder(order)).map(order => order.id)
  const { data: notes } = useQuery(orderNotesQuery(noteOrderIds))

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
        current?.orderId === orderId ? [...toggle(new Set(current.lineIds), lineId)] : [lineId]
      return lineIds.length ? { orderId, lineIds } : null
    })

  return (
    <div className='flex min-w-0 flex-col gap-3.5'>
      <UnscheduledToolbar
        selectedCount={selected.length}
        readOnly={readOnly}
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
              <col className='w-10' />
              <col className='w-40' />
              <col className='w-40' />
              {/* Wide enough for the number and the Stock badge beside it. */}
              <col className='w-40' />
              <col className='w-44' />
              <col />
              {/* The heading is wider than the dot under it, and it is what sets the width. */}
              <col className='w-24' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead />
                <TableHead>Entry</TableHead>
                <TableHead>Ship</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Notes</TableHead>
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
                    readOnly={readOnly}
                    expanded={expandedIds.has(order.id)}
                    selected={selectedIds.has(order.id)}
                    splitLineIds={split?.orderId === order.id ? split.lineIds : []}
                    noteState={noteState(order)}
                    onToggleExpanded={() => setExpandedIds(current => toggle(current, order.id))}
                    onToggleSelected={() => setSelectedIds(current => toggle(current, order.id))}
                    onToggleLine={lineId => toggleLine(order.id, lineId)}
                    onSplit={() => setDialog('split')}
                    onOpenOrderNotes={() => setNoteOrder(order)}
                    onOpenLineNotes={setNoteLine}
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
          departmentId && schedule.mutate({ orders: selected, departmentId, productionDate })
        }
      />

      <ScheduleDialog
        open={dialog === 'split'}
        onOpenChange={open => setDialog(open ? 'split' : null)}
        title='Set production date'
        description={
          splitting
            ? `Splitting ${split?.lineIds.length} of ${splitting.origin_items.length} line items from ${splitting.invoice}.`
            : ''
        }
        actionLabel='Set date'
        departmentId={departmentId}
        isPending={splitOrder.isPending}
        onPick={productionDate =>
          splitting &&
          split &&
          departmentId &&
          splitOrder.mutate({
            order: splitting,
            departmentId,
            productionDate,
            originItems: split.lineIds
          })
        }
      />

      <BypassDialog
        open={dialog === 'bypass'}
        onOpenChange={open => setDialog(open ? 'bypass' : null)}
        orders={selected}
        isPending={bypass.isPending}
        onConfirm={() => departmentId && bypass.mutate({ orders: selected, departmentId })}
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
        order={noteOrder?.id ?? null}
        invoice={noteOrder?.invoice ?? ''}
        note={noteOrder ? notes?.[noteOrder.id] : undefined}
        onOpenChange={open => !open && setNoteOrder(null)}
      />
      <LineNotesDialog
        originItem={noteLine?.id ?? null}
        productId={noteLine?.id_inven ?? ''}
        onOpenChange={open => !open && setNoteLine(null)}
      />
    </div>
  )
}
