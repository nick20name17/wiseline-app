import { useRemembered } from '@/lib/use-remembered'
import * as z from 'zod/mini'
import { StickyTop } from './sticky-top'
import { useBoard, useScheduledSelectable } from '../lib/board-context'
import { formatDate, formatLongDate, today } from '@/lib/days'
import { useColumnOrder } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { QueryError } from '@/components/query-error'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { useRetained } from '@/lib/use-retained'
import { cn } from 'cn'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, CalendarX, SearchX } from 'lucide-react'
import { useState } from 'react'
import {
  countsQuery,
  departmentStateOf,
  isStockOrder,
  isPartial,
  scheduledOrdersQuery,
  useReleaseOrders,
  useSplitOrder,
  useUnscheduleOrder,
  workWeekQuery,
  type BoardLineItem,
  type BoardOrder
} from '../api'
import { partDays, partKey, partLines, partState, splitOf } from '../lib/parts'
import { AllocatedStockDialog } from './allocated-stock-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LineNotesDialog } from './line-notes-dialog'
import { OrderNoteDialog } from './order-note-dialog'
import { ScheduleDialog } from './schedule-dialog'
import { ScheduledDayTabs } from './scheduled-day-tabs'
import { ScheduledRow, type Part } from './scheduled-row'
import { ScheduledToolbar } from './scheduled-toolbar'
import { MachineCapacitiesDialog } from './machine-capacities-dialog'
import { MachineLoads } from './machine-loads'
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

/** A copy of the set with `key` in or out, as a checkbox says it should be. */
const withKey = (set: ReadonlySet<string>, key: string, present: boolean) => {
  const next = new Set(set)
  if (present) next.add(key)
  else next.delete(key)
  return next
}

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
        ships={shown ? [{ order: shown.order.invoice, date: shown.order.ship_date }] : undefined}
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
              originItems: part.lines.map(item => item.id)
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

/**
 * The tab lists parts, not orders: a day tab shows the part sitting on it, and «All Scheduled
 * Orders» every part — so a split order appears once per day it has work on. Production day first,
 * then priority, the hierarchy where 1 sits on top, then the order number; an order with no
 * priority sorts below every one that has one.
 */
const partsOf = (
  orders: BoardOrder[],
  departmentId: number | undefined,
  day: string | null
): Part[] => {
  // Read once per order rather than twice per comparison.
  const rankOf = new Map(
    orders.map(order => [
      order,
      departmentStateOf(order, departmentId)?.priority?.position ?? Number.MAX_SAFE_INTEGER
    ])
  )
  const rank = (order: BoardOrder) => rankOf.get(order) ?? Number.MAX_SAFE_INTEGER

  return orders
    .flatMap(order => {
      const split = splitOf(order)
      return partDays(order, departmentId)
        .filter(candidate => day === null || candidate === day)
        .map((candidate): Part => {
          const lines = partLines(order, candidate)
          return {
            order,
            day: candidate,
            key: partKey(order.id, candidate),
            lines,
            state: partState(order, candidate, departmentId),
            split,
            // Only the orders that are late are red on an overdue day p1 (293,555): a line of this
            // part past its day and not yet wrapped.
            overdue: lines.some(item => item.item?.over_due)
          }
        })
    })
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        rank(a.order) - rank(b.order) ||
        a.order.invoice.localeCompare(b.order.invoice)
    )
}

export const ScheduledTab = ({ search, departmentId, initialDay, machine }: ScheduledTabProps) => {
  // `undefined` until somebody picks a tab; «All Scheduled Orders» is `null` and is chosen, not
  // landed on.
  const [chosenDay, setChosenDay] = useState<string | null | undefined>(initialDay)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  // Export takes Release with it; Release alone leaves Export be p2 (542,607).
  const [exportIds, setExportIds] = useState<Set<string>>(() => new Set())
  const board = useBoard()
  // One order open at a time: opening another folds the last.
  const [expandedKey, setExpandedKey] = useRemembered(
    `expanded:${board.name}:scheduled`,
    z.nullable(z.string()),
    null
  )
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

  const selectable = useScheduledSelectable()
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

  // Asked once the list is whole, not again for every page as it streams in.
  const whole = !isPartial(page)
  const { notes, noteState } = useOrderNotes(whole ? orders : [])

  const release = useReleaseOrders(({ released, exported, cutlists }) => {
    setSelectedIds(new Set())
    setExportIds(new Set())
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
  const parts = partsOf(orders, departmentId, day)

  // A part ticks on its own: one day of a split order goes out without the others.
  const selected = parts.filter(part => selectedIds.has(part.key))
  // A release is all stock orders or all customer orders; the first tick decides which.
  const kindOf = (part: Part) => (isStockOrder(part.order) ? 'stock' : 'customer')
  const selectionKind = selected[0] ? kindOf(selected[0]) : null
  const canRelease = selected.length > 0 && selected.every(part => part.state.reviewed)
  // Select all takes what a row's own box would: the Reviewed parts not yet out, of one kind — the
  // ticked one, or customer orders over stock when nothing is ticked yet.
  const releasable = parts.filter(part => part.state.reviewed && !part.state.released)
  const allKind =
    selectionKind ?? (releasable.some(part => kindOf(part) === 'customer') ? 'customer' : 'stock')
  const pickable = releasable.filter(part => kindOf(part) === allKind)
  const allSelected = pickable.length > 0 && pickable.every(part => selectedIds.has(part.key))
  const selectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(pickable.map(part => part.key)))
    if (allSelected) setExportIds(new Set())
  }

  // Defined once for every row, taking the row's key, so a click re-renders only the rows it changes.
  const toggleExpanded = (key: string) => setExpandedKey(current => (current === key ? null : key))
  // Export takes Release with it, and unticking Release takes Export with it.
  const select = (key: string, checked: boolean) => {
    setSelectedIds(current => withKey(current, key, checked))
    if (!checked) setExportIds(current => withKey(current, key, false))
  }
  const exportPart = (key: string, checked: boolean) => {
    if (checked) setSelectedIds(current => withKey(current, key, true))
    setExportIds(current => withKey(current, key, checked))
  }
  const openLineNotes = (item: BoardLineItem, readOnly: boolean) => setNoteLine({ item, readOnly })

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
    <div className='flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0'>
      <StickyTop>
        <ScheduledDayTabs
          departmentId={departmentId}
          day={day}
          total={everything ?? 0}
          onDayChange={changeDay}
          onOpenCapacities={setCapacitiesDay}
        />

        {/* Only where lines are put on machines by hand, and only for one day. */}
        {board.assignsMachines && day ? (
          <MachineLoads category={board.name} departmentId={departmentId} day={day} />
        ) : null}

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
            const exportDays = selected.filter(part => exportIds.has(part.key)).flatMap(dayOf)
            if (departmentId && days.length) release.mutate({ days, exportDays, departmentId })
          }}
        />
      </StickyTop>

      {!isPending && whole && !parts.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>{search ? <SearchX /> : <CalendarX />}</EmptyMedia>
            <EmptyTitle>{search ? 'No matching orders' : 'Nothing scheduled'}</EmptyTitle>
            <EmptyDescription>
              {search
                ? day
                  ? `No orders scheduled for ${formatDate(day)} match your search.`
                  : 'No scheduled orders match your search.'
                : day
                  ? `No orders are scheduled for ${formatDate(day)}.`
                  : 'No orders are scheduled.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          data-page-table
          className='@container overflow-hidden rounded-lg border border-border bg-card shadow-xs'
        >
          {/* The fixed columns take 1204px, with Rollforming's Export and wider Rollforming Location
              1364px; the minimum width leaves the customer name 184px over them — crush it to nothing
              and two headers print on top of each other. */}
          <Table data-cards className={cn('table-fixed', board.coils ? 'min-w-388' : 'min-w-348')}>
            <colgroup>
              {selectable ? <col className='w-12' /> : null}
              {/* As wide as the checkbox's: the expand button is the whole cell. */}
              <col className='w-10' />
              {columns.cols}
            </colgroup>
            <TableHeader>
              <TableRow>
                {selectable ? (
                  <TableHead>
                    <Checkbox
                      aria-label='Select every Reviewed order'
                      checked={allSelected}
                      disabled={!pickable.length}
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                ) : null}
                <TableHead />
                {columns.headers}
              </TableRow>
            </TableHeader>
            {isPending ? (
              <TableBody>
                <TableSkeletonRows />
              </TableBody>
            ) : (
              parts.map((part, index) => {
                const { key } = part
                return (
                  // One body per part, so a part opened into its line items is one block. It
                  // carries what `TableBody` would, bar the last row's rule, which only the last
                  // part drops — it would double the card's edge.
                  <tbody
                    key={key}
                    className={cn(
                      '[&_td:first-child]:font-medium',
                      index === parts.length - 1 && '[&>tr:last-child>*]:border-b-0'
                    )}
                  >
                    {/* The banding reads every other row by its place among its siblings; a hidden
                          row in front of every second part keeps the stripes where they were. */}
                    {index % 2 ? <tr hidden /> : null}
                    <ScheduledRow
                      part={part}
                      departmentId={departmentId}
                      expanded={expandedKey === key}
                      selected={selectedIds.has(key)}
                      exporting={exportIds.has(key)}
                      locked={!!selectionKind && kindOf(part) !== selectionKind}
                      noteState={noteState(part.order)}
                      onToggleExpanded={toggleExpanded}
                      onSelect={select}
                      onExport={exportPart}
                      onReschedule={setRescheduling}
                      onOpenOrderNotes={setNoteOrder}
                      onOpenLineNotes={openLineNotes}
                    />
                  </tbody>
                )
              })
            )}
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
