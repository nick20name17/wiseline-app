import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import { useState } from 'react'
import {
  departmentStateOf,
  isStockOrder,
  orderNotesQuery,
  overdueQuery,
  scheduledOrdersQuery,
  useReleaseOrders,
  useSplitOrder,
  type TrimLineItem,
  type TrimOrder
} from '../api'
import { formatDate } from '../lib/format'
import { AllocatedStockDialog } from './allocated-stock-dialog'
import { LineNotesDialog } from './line-notes-dialog'
import type { NoteState } from './note-button'
import { OrderNoteDialog } from './order-note-dialog'
import { ScheduleDialog } from './schedule-dialog'
import { ScheduledDayTabs } from './scheduled-day-tabs'
import { ScheduledRow } from './scheduled-row'
import { ScheduledToolbar } from './scheduled-toolbar'
import { MachineCapacitiesDialog } from './machine-capacities-dialog'

type ScheduledTabProps = {
  search: string | undefined
  departmentId: number | undefined
  readOnly: boolean
}

const toggle = (current: Set<string>, id: string) => {
  const next = new Set(current)
  if (!next.delete(id)) next.add(id)
  return next
}

export const ScheduledTab = ({ search, departmentId, readOnly }: ScheduledTabProps) => {
  // `null` is «All Scheduled Orders»; a day narrows the list to that production date.
  const [day, setDay] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [capacitiesDay, setCapacitiesDay] = useState<string | null>(null)
  const [stockOpen, setStockOpen] = useState(false)
  const [rescheduling, setRescheduling] = useState<TrimOrder | null>(null)
  const [noteOrder, setNoteOrder] = useState<TrimOrder | null>(null)
  const [noteLine, setNoteLine] = useState<TrimLineItem | null>(null)

  const { data: page, isPending } = useQuery(scheduledOrdersQuery(search, day))
  const orders = page?.results ?? []
  const { data: overdue } = useQuery(overdueQuery(departmentId))

  const noteOrderIds = orders.filter(order => !isStockOrder(order)).map(order => order.id)
  const { data: notes } = useQuery(orderNotesQuery(noteOrderIds))

  const release = useReleaseOrders(cutlists => {
    setSelectedIds(new Set())
    toast.add({
      type: 'success',
      title: `Released · ${cutlists} cutlist${cutlists === 1 ? '' : 's'} generated`
    })
  })
  // Moving a scheduled order to another day is the same call as scheduling it in the first place.
  const reschedule = useSplitOrder(() => setRescheduling(null))

  const selected = orders.filter(order => selectedIds.has(order.id))
  // A release is all stock orders or all customer orders; the first tick decides which.
  const selectionKind = selected.length ? (isStockOrder(selected[0]!) ? 'stock' : 'customer') : null
  const canRelease =
    selected.length > 0 &&
    selected.every(order => departmentStateOf(order, departmentId)?.reviewed ?? false)

  const noteState = (order: TrimOrder): NoteState => {
    const note = notes?.[order.id]
    if (!note?.has_note) return 'none'
    return note.read ? 'read' : 'unread'
  }

  return (
    <div className='flex min-w-0 flex-col gap-3.5'>
      <ScheduledDayTabs
        departmentId={departmentId}
        day={day}
        total={page?.count ?? orders.length}
        onDayChange={next => {
          setDay(next)
          setSelectedIds(new Set())
        }}
        onOpenCapacities={setCapacitiesDay}
      />

      <ScheduledToolbar
        total={orders.length}
        selectedCount={selected.length}
        selectionKind={selectionKind}
        canRelease={!readOnly && canRelease}
        isReleasing={release.isPending}
        onAllocatedStock={() => setStockOpen(true)}
        onRelease={() => {
          const ids = selected
            .map(order => order.sales_order?.id)
            .filter((id): id is number => id !== undefined)
          if (departmentId && ids.length) release.mutate({ salesOrderIds: ids, departmentId })
        }}
      />

      {!isPending && !orders.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <CalendarClock />
            </EmptyMedia>
            <EmptyTitle>Nothing scheduled</EmptyTitle>
            <EmptyDescription>
              {search
                ? `Nothing matches “${search}”.`
                : day
                  ? `No orders are scheduled for ${formatDate(day)}.`
                  : 'Schedule orders from the Unscheduled tab to see them here by production day.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          {/* The fixed columns add up to less than the minimum width, so the customer name always has
              room left over — crush it to nothing and two headers print on top of each other. */}
          <Table className='min-w-6xl table-fixed'>
            <colgroup>
              <col className='w-12' />
              <col className='w-10' />
              <col className='w-36' />
              <col className='w-52' />
              <col className='w-40' />
              <col />
              <col className='w-32' />
              <col className='w-32' />
              <col className='w-28' />
              <col className='w-20' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead />
                <TableHead>Ship</TableHead>
                <TableHead>Prod. Date</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Reviewed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={9} />
              ) : (
                orders.map(order => {
                  const state = departmentStateOf(order, departmentId)
                  const stock = isStockOrder(order)

                  return (
                    <ScheduledRow
                      key={order.id}
                      order={order}
                      departmentId={departmentId}
                      readOnly={readOnly}
                      expanded={expandedIds.has(order.id)}
                      selected={selectedIds.has(order.id)}
                      locked={!!selectionKind && (stock ? 'stock' : 'customer') !== selectionKind}
                      overdue={
                        state?.over_due ??
                        overdue?.days.includes(state?.production_date ?? '') ??
                        false
                      }
                      noteState={noteState(order)}
                      onToggleExpanded={() => setExpandedIds(current => toggle(current, order.id))}
                      onToggleSelected={() => setSelectedIds(current => toggle(current, order.id))}
                      onReschedule={() => setRescheduling(order)}
                      onOpenOrderNotes={() => setNoteOrder(order)}
                      onOpenLineNotes={setNoteLine}
                    />
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ScheduleDialog
        open={!!rescheduling}
        onOpenChange={open => !open && setRescheduling(null)}
        title={`Reschedule order ${rescheduling?.invoice ?? ''}`}
        description='Pick another production day. Rescheduling resets the edits made while reviewing.'
        actionLabel='Reschedule'
        departmentId={departmentId}
        isPending={reschedule.isPending}
        onPick={productionDate =>
          rescheduling &&
          departmentId &&
          reschedule.mutate({
            order: rescheduling,
            departmentId,
            productionDate,
            // Every line the order has in this department moves together.
            originItems: rescheduling.origin_items.map(item => item.id)
          })
        }
      />

      <MachineCapacitiesDialog
        departmentId={departmentId}
        day={capacitiesDay}
        onOpenChange={open => !open && setCapacitiesDay(null)}
      />
      <AllocatedStockDialog
        departmentId={departmentId}
        open={stockOpen}
        onOpenChange={setStockOpen}
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
