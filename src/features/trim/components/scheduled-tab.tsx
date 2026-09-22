import { useColumnOrder } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { toggled } from '@/lib/sets'
import { useRetained } from '@/lib/use-retained'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, SearchX } from 'lucide-react'
import { useState } from 'react'
import {
  dayStripQuery,
  departmentStateOf,
  isStockOrder,
  orderNotesQuery,
  overdueQuery,
  scheduledOrdersQuery,
  useReleaseOrders,
  useSplitOrder,
  useUnscheduleOrder,
  type TrimLineItem,
  type TrimOrder
} from '../api'
import { SCHEDULED_TABLE } from '../lib/columns'
import { formatDate, formatLongDate, today } from '../lib/format'
import { partDays, partKey, partLines } from '../lib/parts'
import { AllocatedStockDialog } from './allocated-stock-dialog'
import { ConfirmDialog } from './confirm-dialog'
import { LineNotesDialog } from './line-notes-dialog'
import type { NoteState } from './note-button'
import { OrderNoteDialog } from './order-note-dialog'
import { ScheduleDialog } from './schedule-dialog'
import { ScheduledDayTabs, WINDOW_DAYS } from './scheduled-day-tabs'
import { ScheduledRow } from './scheduled-row'
import { ScheduledToolbar } from './scheduled-toolbar'
import { MachineCapacitiesDialog } from './machine-capacities-dialog'

type ScheduledTabProps = {
  search: string | undefined
  departmentId: number | undefined
  /** The day the Calendar sent the board to; without one the tab lands on the first work day. */
  initialDay?: string
}

/** One production day of one order — what a row stands for. */
type Part = { order: TrimOrder; day: string }

type ReschedulePartDialogProps = {
  part: Part | null
  departmentId: number | undefined
  onClose: () => void
  /** The part now sits on another day, and the board follows it there. */
  onMoved: (day: string) => void
}

/** Moving one part to another day, or sending the order back to Unscheduled from the same place. */
const ReschedulePartDialog = ({
  part,
  departmentId,
  onClose,
  onMoved
}: ReschedulePartDialogProps) => {
  const [shown, releaseShown] = useRetained(part)
  const [unscheduling, setUnscheduling] = useState<TrimOrder | null>(null)
  const [unscheduled, releaseUnscheduled] = useRetained(unscheduling)
  // Moving a scheduled part to another day is the same call as scheduling it in the first place.
  const reschedule = useSplitOrder(onClose)
  const unschedule = useUnscheduleOrder(() => setUnscheduling(null))

  return (
    <>
      <ScheduleDialog
        open={!!part}
        onOpenChange={open => !open && onClose()}
        onOpenChangeComplete={releaseShown}
        title={`Reschedule order ${shown?.order.invoice ?? ''}`}
        description='Pick any production day. Rescheduling resets Manager edits.'
        actionLabel='Reschedule'
        departmentId={departmentId}
        initialDay={shown?.day ?? null}
        isPending={reschedule.isPending}
        onPick={productionDate =>
          part &&
          departmentId &&
          reschedule.mutate(
            {
              order: part.order,
              departmentId,
              productionDate,
              // Only the part being moved: the other half of a split order keeps its own day.
              originItems: partLines(part.order, part.day).map(item => item.id)
            },
            {
              onSuccess: () => {
                toast.add({
                  type: 'success',
                  title: `Rescheduled to ${formatLongDate(productionDate)} — Manager edits reset`
                })
                // The board follows the part to the day it now sits on.
                onMoved(productionDate)
              }
            }
          )
        }
        onUnschedule={() => {
          if (!part) return
          setUnscheduling(part.order)
          onClose()
        }}
      />

      {/* The endpoint unschedules the order in this department, not one day of it: a split order
          goes back whole. */}
      <ConfirmDialog
        open={!!unscheduling}
        onOpenChange={open => !open && setUnscheduling(null)}
        onOpenChangeComplete={releaseUnscheduled}
        title={`Unschedule order ${unscheduled?.invoice ?? ''}?`}
        description='Moves it back to Unscheduled and resets all Manager edits (Priority, Reviewed, machines, # From Stock).'
        cancelLabel='Cancel'
        confirmLabel='Confirm'
        isPending={unschedule.isPending}
        onConfirm={() => {
          const salesOrderId = unscheduling?.sales_order?.id
          if (!unscheduling || salesOrderId === undefined || !departmentId) return
          const { invoice } = unscheduling
          unschedule.mutate(
            { salesOrderId, departmentId },
            {
              onSuccess: () =>
                toast.add({
                  type: 'success',
                  title: `Order ${invoice} unscheduled — Manager edits reset`
                })
            }
          )
        }}
      />
    </>
  )
}

export const ScheduledTab = ({ search, departmentId, initialDay }: ScheduledTabProps) => {
  // `undefined` until somebody picks a tab; «All Scheduled Orders» is `null` and is chosen, not
  // landed on.
  const [chosenDay, setChosenDay] = useState<string | null | undefined>(initialDay)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [capacitiesDay, setCapacitiesDay] = useState<string | null>(null)
  const [stockOpen, setStockOpen] = useState(false)
  const [rescheduling, setRescheduling] = useState<Part | null>(null)
  const [noteOrder, setNoteOrder] = useState<TrimOrder | null>(null)
  const [noteLine, setNoteLine] = useState<TrimLineItem | null>(null)

  // The board opens on the first day of the window the tabs show, which the day strip decides — a day
  // the shop is shut is not one it lists.
  const { data: window } = useQuery(dayStripQuery(departmentId, today(), WINDOW_DAYS))
  const day = chosenDay === undefined ? (window?.[0]?.date ?? today()) : chosenDay
  const changeDay = (next: string | null) => {
    setChosenDay(next)
    setSelectedIds(new Set())
  }

  const { data: page, isPending } = useQuery(scheduledOrdersQuery(search, day))
  const columns = useColumnOrder(SCHEDULED_TABLE)
  const orders = page?.results ?? []
  // «All Scheduled Orders» counts everything on the tab, whatever day or search is showing.
  const { data: everything } = useQuery(scheduledOrdersQuery(undefined, null))
  const { data: overdue } = useQuery(overdueQuery(departmentId))
  const overdueDays = new Set(overdue?.days)

  const noteOrderIds = orders.filter(order => !isStockOrder(order)).map(order => order.id)
  const { data: notes } = useQuery(orderNotesQuery(noteOrderIds))

  const release = useReleaseOrders((released, cutlists) => {
    setSelectedIds(new Set())
    toast.add({
      type: 'success',
      title: `Released ${released} order${released === 1 ? '' : 's'} · ${cutlists} cutlist${cutlists === 1 ? '' : 's'} generated`
    })
  })
  const rank = (order: TrimOrder) =>
    departmentStateOf(order, departmentId)?.priority?.position ?? Number.MAX_SAFE_INTEGER

  /**
   * The tab lists parts, not orders: a day tab shows the part sitting on it, and «All Scheduled
   * Orders» every part — so a split order appears once per day it has work on. Production day first,
   * then priority, the hierarchy where 1 sits on top, then the order number; an order with no
   * priority sorts below every one that has one.
   */
  const parts: Part[] = orders
    .flatMap(order =>
      partDays(order, departmentId)
        .filter(candidate => day === null || candidate === day)
        .map(candidate => ({ order, day: candidate }))
    )
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        rank(a.order) - rank(b.order) ||
        a.order.invoice.localeCompare(b.order.invoice)
    )

  // Review and release are recorded per order, not per day, so both halves of a split order tick
  // together; the API has no per-day release to offer.
  const listed = new Set(parts.map(part => part.order.id))
  const selected = orders.filter(order => selectedIds.has(order.id) && listed.has(order.id))
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

  // Nothing scheduled at all points back at Unscheduled; empty day tabs would say nothing.
  if (everything && !everything.count)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <CalendarClock />
          </EmptyMedia>
          <EmptyTitle>Nothing scheduled</EmptyTitle>
          <EmptyDescription>
            Schedule orders from the Unscheduled tab to see them here by production day.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  return (
    <div className='flex min-w-0 flex-col gap-3.5'>
      <ScheduledDayTabs
        departmentId={departmentId}
        day={day}
        total={everything?.count ?? 0}
        onDayChange={changeDay}
        onOpenCapacities={setCapacitiesDay}
      />

      <ScheduledToolbar
        total={parts.length}
        day={day}
        selectedCount={selected.length}
        selectionKind={selectionKind}
        canRelease={canRelease}
        isReleasing={release.isPending}
        onAllocatedStock={() => setStockOpen(true)}
        onRelease={() => {
          const ids = selected
            .map(order => order.sales_order?.id)
            .filter((id): id is number => id !== undefined)
          if (departmentId && ids.length) release.mutate({ salesOrderIds: ids, departmentId })
        }}
      />

      {!isPending && !parts.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No matching orders</EmptyTitle>
            <EmptyDescription>
              {day
                ? `No orders scheduled for ${formatDate(day)} match your search.`
                : 'No scheduled orders match your search.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          {/* The fixed columns add up to less than the minimum width, so the customer name always has
              room left over — crush it to nothing and two headers print on top of each other. */}
          <Table className='min-w-360 table-fixed'>
            <colgroup>
              <col className='w-12' />
              <col className='w-10' />
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
                <TableSkeletonRows columns={10} />
              ) : (
                parts.map(part => {
                  const { order } = part
                  const key = partKey(order.id, part.day)
                  const stock = isStockOrder(order)
                  // The part's own day is what can be late, not the order's earliest.
                  const late =
                    overdueDays.has(part.day) ||
                    (!!departmentStateOf(order, departmentId)?.over_due && part.day < today())

                  return (
                    <ScheduledRow
                      key={key}
                      order={order}
                      day={part.day}
                      departmentId={departmentId}
                      expanded={expandedIds.has(key)}
                      selected={selectedIds.has(order.id)}
                      locked={!!selectionKind && (stock ? 'stock' : 'customer') !== selectionKind}
                      overdue={late}
                      noteState={noteState(order)}
                      onToggleExpanded={() => setExpandedIds(current => toggled(current, key))}
                      onToggleSelected={() => setSelectedIds(current => toggled(current, order.id))}
                      onReschedule={() => setRescheduling(part)}
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

      <ReschedulePartDialog
        part={rescheduling}
        departmentId={departmentId}
        onClose={() => setRescheduling(null)}
        onMoved={changeDay}
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
        order={noteOrder}
        notes={notes}
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
