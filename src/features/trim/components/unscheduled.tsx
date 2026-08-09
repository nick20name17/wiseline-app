import {
  Calendar,
  CalendarDays,
  ChevronRight,
  FastForward,
  Plus,
  QrCode,
  Split,
  X
} from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'
import { isWorkDay } from '@/store/shared/settings'

import { fmtCompactDate, fmtDate } from '../format'
import {
  nextWorkDays,
  orderMatchesSearch,
  scheduledDays,
  totalDailyCap,
  unscheduledOrders
} from '../selectors'
import {
  bypassProduction,
  clearPeekDay,
  TODAY,
  toggleExpand,
  toggleOrderSelect,
  trimStore
} from '../store'
import { askConfirm, closeConfirm, openSchedule, showToast } from '../ui'
import { EmptyState, NoteButton, PriorityCell } from './bits'
import { LineItemsSubrow } from './line-items'

/**
 * The read-only glance strip: today plus the next four work days, each with the bends already
 * scheduled against the plant's daily capacity. The chips are not clickable (N-158) — they answer
 * "how full is this week" while somebody decides what to schedule, and nothing more.
 */
const NextDays = ({ peek }: { peek: string | null }) => {
  const bendsByDay = new Map(scheduledDays().map(day => [day.date, day.bends]))
  const dayCap = totalDailyCap()
  const days = nextWorkDays(TODAY, 5)

  return (
    <div className='next-days' data-comment='uns-next-five-days'>
      {days.map((iso, index) => (
        <div
          key={iso}
          className={`next-day${iso === TODAY ? ' next-day-today' : ''}`}
          data-comment={`uns-next-day-${index + 1}`}
          title={`${fmtDate(iso)}${iso === TODAY ? ' · today' : ''} — bends scheduled`}
        >
          <span className='next-day-date' data-comment={`uns-next-day-date-${index + 1}`}>
            {fmtCompactDate(iso)}
            {iso === TODAY ? ' · today' : ''}
          </span>
          <span
            className='next-day-bends mono'
            data-comment={`uns-next-day-bends-${index + 1}`}
            title='Bends scheduled / plant daily capacity'
          >
            ({bendsByDay.get(iso) ?? 0} / {dayCap})
          </span>
        </div>
      ))}

      {peek && !days.includes(peek) ? (
        <div
          className='next-day next-day-peek'
          data-comment='uns-next-day-peek'
          title={`${fmtDate(peek)} — picked from the calendar${isWorkDay(peek) ? '' : ' · non-work day'}`}
        >
          <span className='next-day-date' data-comment='uns-next-day-peek-date'>
            {fmtCompactDate(peek)}
          </span>
          <span
            className='next-day-bends mono'
            data-comment='uns-next-day-peek-bends'
            title='Bends scheduled / plant daily capacity'
          >
            ({bendsByDay.get(peek) ?? 0} / {dayCap})
          </span>
          <button
            className='next-day-clear'
            data-comment='uns-next-day-peek-clear'
            title='Remove this day'
            onClick={clearPeekDay}
          >
            <X style={{ width: '12px', height: '12px' }} />
          </button>
        </div>
      ) : null}

      <button
        className='next-day-cal'
        data-comment='uns-daypicker'
        title='Show any other day'
        onClick={() => openSchedule({ mode: 'peek', current: peek })}
      >
        <Calendar style={{ width: '15px', height: '15px' }} />
        <span className='next-day-cal-label' data-comment='uns-daypicker-label'>
          {peek ? 'Another day' : 'Pick a day'}
        </span>
      </button>
    </div>
  )
}

/**
 * A draggable data-column header (N-166). Columns reorder per viewing-as role and per table; the
 * checkbox and expander columns are service columns and stay pinned, so they are plain `<th>`.
 */
const ColHeader = ({
  table,
  col,
  label,
  width
}: {
  table: string
  col: string
  label: string
  width?: string
}) => (
  <th
    data-col={col}
    draggable
    className='col-move'
    data-comment={`${table}-colh-${col}`}
    title='Drag to reorder column'
    style={width ? { width } : undefined}
  >
    {label}
  </th>
)

export const Unscheduled = () => {
  const state = useStore(trimStore, current => current)
  const rows = unscheduledOrders(state.orders).filter(orderMatchesSearch)
  const selectedCount = state.selectedOrderIds.filter(id =>
    rows.some(order => order.id === id)
  ).length

  return (
    <>
      <div className='toolbar' data-comment='uns-toolbar'>
        <span className='toolbar-info' data-comment='uns-count'>
          {selectedCount ? (
            <>
              <b>{selectedCount}</b> selected
            </>
          ) : (
            <>
              <b>{rows.length}</b> unscheduled order{rows.length !== 1 ? 's' : ''}
            </>
          )}
        </span>

        <NextDays peek={state.peekDay} />

        <div className='toolbar-spacer' />

        <button className='btn' data-comment='uns-stock-cards' title='Stock Cards (QR pull sheets)'>
          <QrCode style={{ width: '14px', height: '14px' }} />
          Stock Cards
        </button>
        <button className='btn' data-comment='uns-create-stock'>
          <Plus style={{ width: '14px', height: '14px' }} />
          Create stock order
        </button>
        <button
          className='btn'
          data-comment='uns-bypass'
          disabled={!selectedCount}
          onClick={() => {
            const ids = trimStore.get().selectedOrderIds
            const orders = trimStore.get().orders.filter(order => ids.includes(order.id))
            const label =
              orders.length === 1 ? `order ${orders[0]!.order}` : `${orders.length} orders`

            askConfirm(
              `Bypass Production — ${label}?`,
              'Are you sure you want this order(s) to bypass all the production tabs and go straight to the wrapping stage?',
              () => {
                bypassProduction(ids)
                closeConfirm()
                showToast(
                  `Bypassed ${ids.length} order${ids.length > 1 ? 's' : ''} to Wrapping · Production Date ${fmtDate(TODAY)}`
                )
              }
            )
          }}
          title='Skip Slinet + Machines — straight to Wrapping (Status: Bypassed), Production Date today'
        >
          <FastForward style={{ width: '14px', height: '14px' }} />
          Bypass Production
          {selectedCount ? ` (${selectedCount})` : ''}
        </button>
        <button
          className='btn btn-primary'
          data-comment='uns-schedule'
          disabled={!selectedCount}
          onClick={() =>
            openSchedule({
              mode: 'entire',
              orderIds: trimStore.get().selectedOrderIds,
              orderCount: selectedCount
            })
          }
        >
          <CalendarDays style={{ width: '14px', height: '14px' }} />
          Schedule
          {selectedCount ? ` (${selectedCount})` : ''}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title='No unscheduled orders'
          text='New orders from EBMS land here. Create a stock order to add one manually.'
        />
      ) : (
        <div className='table-wrap' data-comment='uns-table-wrap'>
          <table className='grid' data-comment='uns-table'>
            <thead>
              <tr>
                <th className='col-chk' />
                <th className='col-exp' />
                <ColHeader table='uns' col='entry' label='Entry' width='190px' />
                <ColHeader table='uns' col='ship' label='Ship' width='190px' />
                <ColHeader table='uns' col='order' label='Order #' width='110px' />
                <ColHeader table='uns' col='priority' label='Priority' width='140px' />
                <ColHeader table='uns' col='customer' label='Customer' />
                <ColHeader table='uns' col='notes' label='Notes' width='56px' />
              </tr>
            </thead>
            <tbody data-comment='uns-tbody'>
              {rows.map(order => {
                const selected = state.selectedOrderIds.includes(order.id)
                const expanded = state.expandedIds.includes(order.id)
                const splitCount =
                  state.splitOrderId === order.id ? state.selectedLineIds.length : 0
                // picking line items for a split and selecting the whole order are mutually exclusive
                const splitActive = splitCount > 0

                return (
                  <Fragment key={order.id}>
                    <tr
                      className={`row-order ${selected ? 'selected' : ''}${expanded ? ' is-expanded' : ''}`}
                      data-comment={`uns-row-${order.id}`}
                      style={{ cursor: 'pointer' }}
                      onClick={event => {
                        if (
                          (event.target as HTMLElement).closest(
                            'button,input,select,textarea,a,label,[data-pop-anchor],.chk'
                          )
                        )
                          return
                        toggleExpand(order.id)
                      }}
                    >
                      <td>
                        <input
                          type='checkbox'
                          className='chk'
                          data-comment={`uns-chk-${order.id}`}
                          checked={selected}
                          disabled={splitActive}
                          title={
                            splitActive
                              ? 'Clear the Split selection on this order first'
                              : undefined
                          }
                          onChange={() => toggleOrderSelect(order.id)}
                        />
                      </td>
                      <td>
                        <button
                          aria-label='Toggle details'
                          className={`expander ${expanded ? 'open' : ''}`}
                          data-comment={`uns-exp-${order.id}`}
                          onClick={() => toggleExpand(order.id)}
                        >
                          <ChevronRight style={{ width: '14px', height: '14px' }} />
                        </button>
                      </td>
                      <td
                        data-col='entry'
                        className='cell-num muted'
                        data-comment={`uns-entry-${order.id}`}
                      >
                        {fmtDate(order.entryDate)}
                      </td>
                      <td
                        data-col='ship'
                        className='cell-num muted'
                        data-comment={`uns-ship-${order.id}`}
                      >
                        {order.shipDate ? fmtDate(order.shipDate) : '—'}
                      </td>
                      <td
                        data-col='order'
                        className='cell-order'
                        data-comment={`uns-order-${order.id}`}
                      >
                        {order.order}
                        {order.isSplit ? (
                          <span
                            className='split-ind'
                            data-comment={`uns-split-${order.id}`}
                            title='Partially scheduled — some line items are on the Scheduled tab'
                          >
                            <Split style={{ width: '14px', height: '14px' }} />
                          </span>
                        ) : null}
                      </td>
                      <td data-col='priority' data-comment={`uns-pri-cell-${order.id}`}>
                        <PriorityCell order={order} />
                      </td>
                      <td
                        data-col='customer'
                        className='cell-cust'
                        data-comment={`uns-cust-${order.id}`}
                      >
                        {order.customer}
                      </td>
                      <td data-col='notes' data-comment={`uns-note-${order.id}`}>
                        <NoteButton order={order} />
                      </td>
                    </tr>
                    {expanded ? <LineItemsSubrow order={order} ctx='uns' /> : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
