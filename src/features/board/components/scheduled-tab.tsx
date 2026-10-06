import { useBoard } from '../lib/board-context'
import { formatDate, formatLongDate, today } from '@/lib/days'
import { useColumnOrder } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { QueryError } from '@/components/query-error'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { toggled } from '@/lib/sets'
import { useRetained } from '@/lib/use-retained'
import { cn } from 'cn'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, SearchX } from 'lucide-react'
import { useState } from 'react'
import {
  countsQuery,
  departmentStateOf,
  isStockOrder,
  scheduledOrdersQuery,
  useReleaseOrders,
  useSplitOrder,
  useUnscheduleOrder,
  workWeekQuery,
  type BoardLineItem,
  type BoardOrder
} from '../api'
import { partDays, partKey, partLines, partState } from '../lib/parts'
import { AllocatedStockDialog } from './allocated-stock-dialog'
import { ConfirmDialog } from './confirm-dialog'
import { LineNotesDialog } from './line-notes-dialog'
import { OrderNoteDialog } from './order-note-dialog'
import { ScheduleDialog } from './schedule-dialog'
import { ScheduledDayTabs } from './scheduled-day-tabs'
import { ScheduledRow } from './scheduled-row'
import { ScheduledToolbar } from './scheduled-toolbar'
import { MachineCapacitiesDialog } from './machine-capacities-dialog'
import { useOrderNotes } from './use-line-note-state'
import { onMachine, type MachineTab } from '../lib/machines'

type ScheduledTabProps = {
  search: string | undefined
  departmentId: number | undefined
  /** The day the Calendar sent the board to; without one the tab lands on the first work day. */
  initialDay?: string
  /** Rollforming's machine tab; none on a board without them. */
  machine?: MachineTab
}

/** One production day of one order — what a row stands for. */
type Part = { order: BoardOrder; day: string }

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
  const [unscheduling, setUnscheduling] = useState<Part | null>(null)
  const [unscheduled, releaseUnscheduled] = useRetained(unscheduling)
  // Moving a scheduled part to another day is the same call as scheduling it in the first place.
  const reschedule = useSplitOrder(onClose)
  const unschedule = useUnscheduleOrder(() => setUnscheduling(null))
  // An order on one day goes back whole; one spread over several gives back only the row's day.
  const oneDayOf = (target: Part) =>
    partDays(target.order, departmentId).length > 1 ? target.day : undefined
  const unscheduledDay = unscheduled ? oneDayOf(unscheduled) : undefined

  return (
    <>
      <ScheduleDialog
        open={!!part}
        onOpenChange={open => !open && onClose()}
        onOpenChangeComplete={releaseShown}
        title={`Reschedule order ${shown?.order.invoice ?? ''}`}
        description={`Pick any ${useBoard().dayWord}. Rescheduling resets Manager edits.`}
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
          setUnscheduling(part)
          onClose()
        }}
      />

      {/* A split order gives back only the row's day; the rest keeps its days, and the order its
          Priority and Reviewed while any of it is still scheduled. */}
      <ConfirmDialog
        open={!!unscheduling}
        onOpenChange={open => !open && setUnscheduling(null)}
        onOpenChangeComplete={releaseUnscheduled}
        title={
          unscheduledDay
            ? `Unschedule order ${unscheduled?.order.invoice ?? ''} on ${formatDate(unscheduledDay)}?`
            : `Unschedule order ${unscheduled?.order.invoice ?? ''}?`
        }
        destructive
        description={
          unscheduledDay
            ? `Moves this day's line items back to Unscheduled and resets their Manager edits (machines, # From Stock). The line items on the order's other days stay scheduled.`
            : 'Moves it back to Unscheduled and resets all Manager edits (Priority, Reviewed, machines, # From Stock).'
        }
        cancelLabel='Cancel'
        confirmLabel='Confirm'
        isPending={unschedule.isPending}
        onConfirm={() => {
          const salesOrderId = unscheduling?.order.sales_order?.id
          if (!unscheduling || salesOrderId === undefined || !departmentId) return
          const { invoice } = unscheduling.order
          const productionDate = unscheduledDay
          unschedule.mutate(
            { salesOrderId, departmentId, productionDate },
            {
              onSuccess: () =>
                toast.add({
                  type: 'success',
                  title: productionDate
                    ? `Order ${invoice} unscheduled from ${formatDate(productionDate)} — Manager edits reset`
                    : `Order ${invoice} unscheduled — Manager edits reset`
                })
            }
          )
        }}
      />
    </>
  )
}

export const ScheduledTab = ({ search, departmentId, initialDay, machine }: ScheduledTabProps) => {
  // `undefined` until somebody picks a tab; «All Scheduled Orders» is `null` and is chosen, not
  // landed on.
  const [chosenDay, setChosenDay] = useState<string | null | undefined>(initialDay)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  // Export takes Release with it; Release alone leaves Export be p2 (542,607).
  const [exportIds, setExportIds] = useState<Set<string>>(() => new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [capacitiesDay, setCapacitiesDay] = useState<string | null>(null)
  const [stockOpen, setStockOpen] = useState(false)
  const [rescheduling, setRescheduling] = useState<Part | null>(null)
  const [noteOrder, setNoteOrder] = useState<BoardOrder | null>(null)
  const [noteLine, setNoteLine] = useState<{ item: BoardLineItem; readOnly: boolean } | null>(null)

  // The board opens on the first day of the window the tabs show, which the day strip decides — a day
  // the shop is shut is not one it lists.
  const { data: window } = useQuery(workWeekQuery(departmentId, today()))
  const day = chosenDay === undefined ? (window?.[0]?.date ?? today()) : chosenDay
  const changeDay = (next: string | null) => {
    setChosenDay(next)
    setSelectedIds(new Set())
  }

  const board = useBoard()
  const {
    data: page,
    isPending,
    isError,
    error,
    refetch
  } = useQuery(scheduledOrdersQuery(board.name, search))
  const columns = useColumnOrder(board.tables.scheduled)
  const orders = onMachine(page?.results ?? [], machine)
  // «All Scheduled Orders» counts everything on the tab, whatever day or search is showing.
  const { data: counts } = useQuery(countsQuery(departmentId))
  const everything = counts?.scheduled

  const { notes, noteState } = useOrderNotes(orders)

  const release = useReleaseOrders(({ released, exported, cutlists, missed }) => {
    setSelectedIds(new Set())
    setExportIds(new Set())
    if (missed.length) {
      const invoices = missed.map(
        id => page?.results.find(order => order.sales_order?.id === id)?.invoice ?? `#${id}`
      )
      toast.add({
        type: 'warning',
        title: `${missed.length} order${missed.length === 1 ? ' was' : 's were'} not released`,
        description: `${invoices.join(', ')} stayed on Scheduled. Try releasing ${missed.length === 1 ? 'it' : 'them'} again.`
      })
    }
    if (!released) return
    toast.add({
      type: 'success',
      title: [
        `Released ${released} order${released === 1 ? '' : 's'}`,
        exported ? `${exported} exported` : null,
        board.makes && !board.coils
          ? `${cutlists} cutlist${cutlists === 1 ? '' : 's'} generated`
          : null
      ]
        .filter(Boolean)
        .join(' · ')
    })
  })
  const rank = (order: BoardOrder) =>
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

  // A part ticks on its own: one day of a split order goes out without the others.
  const selected = parts.filter(part => selectedIds.has(partKey(part.order.id, part.day)))
  // A release is all stock orders or all customer orders; the first tick decides which.
  const selectionKind = selected.length
    ? isStockOrder(selected[0]!.order)
      ? 'stock'
      : 'customer'
    : null
  const canRelease =
    selected.length > 0 &&
    selected.every(part => partState(part.order, part.day, departmentId).reviewed)

  // A list that never arrived is not an empty one.
  if (isError && !page)
    return (
      <QueryError
        title='The scheduled orders did not load'
        error={error}
        onRetry={() => void refetch()}
      />
    )

  // Nothing scheduled at all points back at Unscheduled; empty day tabs would say nothing.
  // The count takes Open orders only, so an order the list does hold still keeps the table up.
  if (everything === 0 && !isPending && !orders.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <CalendarClock />
          </EmptyMedia>
          <EmptyTitle>Nothing scheduled</EmptyTitle>
          <EmptyDescription>
            Schedule orders from the Unscheduled tab to see them here by {board.dayWord}.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-3.5'>
      <ScheduledDayTabs
        departmentId={departmentId}
        day={day}
        total={everything ?? 0}
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
          const dayOf = (part: Part) =>
            part.order.sales_order
              ? [{ sales_order_id: part.order.sales_order.id, production_date: part.day }]
              : []
          const days = selected.flatMap(dayOf)
          const exportDays = selected
            .filter(part => exportIds.has(partKey(part.order.id, part.day)))
            .flatMap(dayOf)
          if (departmentId && days.length) release.mutate({ days, exportDays, departmentId })
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
          {/* Rollforming's Export column takes room of its own. */}
          <Table className={cn('table-fixed', board.coils ? 'min-w-384' : 'min-w-360')}>
            <colgroup>
              <col className='w-12' />
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
                <TableSkeletonRows columns={10} />
              ) : (
                parts.map(part => {
                  const { order } = part
                  const key = partKey(order.id, part.day)
                  const stock = isStockOrder(order)
                  // Only the orders that are late are red on an overdue day p1 (293,555): a line
                  // of this part past its day and not yet wrapped.
                  const late = partLines(order, part.day).some(item => item.item?.over_due)

                  return (
                    <ScheduledRow
                      key={key}
                      order={order}
                      day={part.day}
                      departmentId={departmentId}
                      expanded={expandedIds.has(key)}
                      selected={selectedIds.has(key)}
                      exporting={exportIds.has(key)}
                      locked={!!selectionKind && (stock ? 'stock' : 'customer') !== selectionKind}
                      overdue={late}
                      noteState={noteState(order)}
                      onToggleExpanded={() => setExpandedIds(current => toggled(current, key))}
                      onToggleSelected={() => {
                        if (selectedIds.has(key))
                          setExportIds(current => {
                            const next = new Set(current)
                            next.delete(key)
                            return next
                          })
                        setSelectedIds(current => toggled(current, key))
                      }}
                      onToggleExport={() => {
                        if (!exportIds.has(key))
                          setSelectedIds(current => new Set(current).add(key))
                        setExportIds(current => toggled(current, key))
                      }}
                      onReschedule={() => setRescheduling(part)}
                      onOpenOrderNotes={() => setNoteOrder(order)}
                      onOpenLineNotes={(item, readOnly) => setNoteLine({ item, readOnly })}
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
        originItem={noteLine?.item.id ?? null}
        productId={noteLine?.item.id_inven ?? ''}
        readOnly={noteLine?.readOnly}
        onOpenChange={open => !open && setNoteLine(null)}
      />
    </div>
  )
}
