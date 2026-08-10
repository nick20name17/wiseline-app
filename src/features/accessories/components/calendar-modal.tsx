import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate } from '../format'
import { isOverdue, scheduledOrders } from '../selectors'
import {
  accessoriesStore,
  rescheduleOrder,
  scheduleEntire,
  scheduleSplit,
  TODAY,
  unscheduleOrder
} from '../store'
import { showToast } from '../ui'

/**
 * The three questions this calendar answers.
 *
 * `entire` sets the Prep Date on every line of the picked orders, `split` only on the lines that were
 * ticked, and `reschedule` moves an order already dated — that last one alone offers Unschedule, and
 * alone opens on the day the order already has.
 */
export type ScheduleCtx =
  | { mode: 'entire'; orderIds: number[] }
  | { mode: 'split'; orderId: number; lineIds: number[] }
  | { mode: 'reschedule'; orderId: number }

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export const CalendarModal = ({
  ctx,
  onClose
}: {
  ctx: ScheduleCtx | null
  onClose: () => void
}) => {
  const orders = useStore(accessoriesStore, state => state.orders)
  const order =
    ctx && ctx.mode !== 'entire' ? orders.find(entry => entry.id === ctx.orderId) : undefined
  const preset = ctx?.mode === 'reschedule' ? (order?.prepDate ?? null) : null

  const [selected, setSelected] = useState<string | null>(preset)
  const [month, setMonth] = useState(preset ? Number(preset.split('-')[1]) - 1 : 6)
  const [year, setYear] = useState(preset ? Number(preset.split('-')[0]) : 2026)

  const shift = (delta: number) => {
    const next = month + delta
    if (next < 0) {
      setMonth(11)
      setYear(year - 1)
    } else if (next > 11) {
      setMonth(0)
      setYear(year + 1)
    } else setMonth(next)
  }

  const startDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const overdueDates = new Set(
    scheduledOrders(orders)
      .filter(isOverdue)
      .map(entry => entry.prepDate)
  )

  const desc = !ctx
    ? 'Choose the day to schedule packaging for.'
    : ctx.mode === 'entire'
      ? `Scheduling ${ctx.orderIds.length} order${ctx.orderIds.length > 1 ? 's' : ''} — sets the Prep Date on every line item.`
      : ctx.mode === 'split'
        ? `Scheduling ${ctx.lineIds.length} of ${order?.items.length ?? 0} line items from ${order?.orderNumber ?? ''} — the rest stays in Unscheduled.`
        : `Reschedule ${order?.orderNumber ?? ''} to another Prep Date, or unschedule it back to Unscheduled.`

  const apply = () => {
    if (!ctx || !selected) return

    if (ctx.mode === 'entire') {
      scheduleEntire(ctx.orderIds, selected)
      showToast(`Scheduled to ${fmtDate(selected)}`)
    } else if (ctx.mode === 'split') {
      scheduleSplit(ctx.orderId, ctx.lineIds, selected)
      showToast(`Partial schedule set to ${fmtDate(selected)}`)
    } else {
      rescheduleOrder(ctx.orderId, selected)
      showToast(`Rescheduled to ${fmtDate(selected)}`)
    }

    onClose()
  }

  const unschedule = () => {
    if (ctx?.mode !== 'reschedule' || !order) return
    onClose()
    unscheduleOrder(order.id)
    showToast(`Order ${order.orderNumber} unscheduled`)
  }

  return (
    <Overlay id='overlay-calendar' comment='overlay-calendar' open={!!ctx} onClose={onClose}>
      <div className='modal' data-comment='calendar-modal' data-component='dialog'>
        <ModalHead
          comment='calendar-head'
          titleComment='calendar-title'
          descComment='calendar-desc'
          title='Set Prep Date'
          desc={desc}
          onClose={onClose}
        />
        <div className='modal-body' data-comment='calendar-body'>
          <div className='cal-head' data-comment='calendar-monthbar'>
            <button
              className='cal-nav'
              aria-label='Previous month'
              data-comment='calendar-prev'
              onClick={() => shift(-1)}
            >
              <ChevronLeft style={{ width: '14px', height: '14px' }} />
            </button>
            <div className='cal-month' id='cal-month' data-comment='calendar-month'>
              {MONTHS[month]} {year}
            </div>
            <button
              className='cal-nav'
              aria-label='Next month'
              data-comment='calendar-next'
              onClick={() => shift(1)}
            >
              <ChevronRight style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
          <div className='cal-grid' id='cal-grid' data-comment='calendar-grid'>
            {DOW.map((day, index) => (
              <div className='cal-dow' data-comment={`cal-dow-${index}`} key={index}>
                {day}
              </div>
            ))}
            {Array.from({ length: startDow }, (_, index) => (
              <button
                className='cal-day other'
                data-comment={`cal-prev-${index}`}
                disabled
                key={index}
              >
                {prevDays - startDow + index + 1}
              </button>
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const date = iso(year, month, index + 1)
              const overdue = overdueDates.has(date)
              const cls = [
                date === TODAY ? 'today' : '',
                date === selected ? 'selected' : '',
                overdue ? 'overdue' : ''
              ].join(' ')

              return (
                <button
                  className={`cal-day ${cls}`}
                  data-comment={`cal-day-${date}`}
                  onClick={() => setSelected(date)}
                  // a day carrying overdue work is called out even when it is not the chosen one
                  style={
                    overdue && date !== selected
                      ? { color: 'var(--danger)', fontWeight: 600 }
                      : undefined
                  }
                  key={date}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
        </div>
        <div className='modal-foot' data-comment='calendar-foot'>
          {ctx?.mode === 'reschedule' ? (
            <button
              className='btn btn-ghost'
              data-comment='calendar-unschedule'
              id='calendar-unschedule-btn'
              style={{ marginRight: 'auto' }}
              onClick={unschedule}
            >
              Unschedule
            </button>
          ) : null}
          <button className='btn btn-ghost' data-comment='calendar-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='calendar-set'
            data-comment='calendar-set'
            disabled={!selected}
            onClick={apply}
          >
            Set Prep Date
          </button>
        </div>
      </div>
    </Overlay>
  )
}
