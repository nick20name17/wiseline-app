import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useStore } from '@/store/create-store'
import { isWorkDay } from '@/store/shared/settings'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { isDoneInProduction, isOverdue } from '../selectors'
import {
  rescheduleOrder,
  rollformingStore,
  scheduleEntire,
  scheduleSplit,
  TODAY,
  unscheduleOrder
} from '../store'

/**
 * What the calendar is being asked for. One modal serves all three, which is why the description and
 * the Unschedule button move together — the prototype keeps a single context variable for them.
 */
export type ScheduleCtx =
  | { mode: 'entire'; orderIds: number[] }
  | { mode: 'split'; orderId: number; lineIds: number[]; order: string; total: number }
  | { mode: 'reschedule'; orderId: number; order: string; current: string | null }

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

const describe = (ctx: ScheduleCtx) => {
  if (ctx.mode === 'entire')
    return `Scheduling ${ctx.orderIds.length} order${ctx.orderIds.length > 1 ? 's' : ''} entirely.`
  if (ctx.mode === 'split')
    return `Scheduling ${ctx.lineIds.length} of ${ctx.total} line items from ${ctx.order}.`
  return `Reschedule ${ctx.order} to another production date, or unschedule it.`
}

export const CalendarModal = ({
  ctx,
  onClose
}: {
  ctx: ScheduleCtx | null
  onClose: () => void
}) => {
  // July 2026 is where the prototype opens, and the seed's production days all sit in it
  const [month, setMonth] = useState(6)
  const [year, setYear] = useState(2026)
  // a reschedule opens on the day the order already has, so Set date is live immediately
  const [selected, setSelected] = useState<string | null>(
    ctx?.mode === 'reschedule' ? ctx.current : null
  )
  const orders = useStore(rollformingStore, state => state.orders)

  const shift = (by: number) => {
    const next = month + by
    if (next < 0) {
      setMonth(11)
      setYear(year - 1)
      return
    }
    if (next > 11) {
      setMonth(0)
      setYear(year + 1)
      return
    }
    setMonth(next)
  }

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()

  // #211: release no longer clears overdue, but being finished still does
  const overdueDates = new Set(
    orders
      .filter(
        order =>
          order.productionDate && isOverdue(order.productionDate) && !isDoneInProduction(order)
      )
      .map(order => order.productionDate)
  )

  const confirm = () => {
    if (!ctx || !selected) return
    if (ctx.mode === 'entire') scheduleEntire(ctx.orderIds, selected)
    else if (ctx.mode === 'split') scheduleSplit(ctx.orderId, ctx.lineIds, selected)
    else rescheduleOrder(ctx.orderId, selected)
    onClose()
  }

  return (
    <Overlay id='overlay-calendar' comment='overlay-calendar' open={!!ctx} onClose={onClose}>
      <div className='modal' data-comment='calendar-modal' data-component='dialog'>
        <ModalHead
          comment='calendar-head'
          titleComment='calendar-title'
          descComment='calendar-desc'
          title='Set production date'
          desc={ctx ? describe(ctx) : 'Choose the day to schedule for.'}
          onClose={onClose}
        />
        <div className='modal-body' data-comment='calendar-body'>
          <div className='cal-head' data-comment='calendar-monthbar'>
            <button className='cal-nav' data-comment='calendar-prev' onClick={() => shift(-1)}>
              <ChevronLeft style={{ width: '14px', height: '14px' }} />
            </button>
            <div className='cal-month' id='cal-month' data-comment='calendar-month'>
              {MONTHS[month]} {year}
            </div>
            <button className='cal-nav' data-comment='calendar-next' onClick={() => shift(1)}>
              <ChevronRight style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
          <div className='cal-grid' id='cal-grid' data-comment='calendar-grid'>
            {DOW.map((day, index) => (
              <div className='cal-dow' data-comment={`cal-dow-${index}`} key={index}>
                {day}
              </div>
            ))}
            {Array.from({ length: firstDow }, (_, index) => (
              <button
                className='cal-day other'
                data-comment={`cal-prev-${index}`}
                disabled
                key={index}
              >
                {prevDays - firstDow + index + 1}
              </button>
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1
              const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const overdue = overdueDates.has(iso)
              // #129: Work Days is a plant setting, so a day the shop is shut takes no work here either
              const shut = !isWorkDay(iso)

              return (
                <button
                  className={`cal-day ${[
                    iso === TODAY ? 'today' : '',
                    iso === selected ? 'selected' : '',
                    overdue ? 'overdue' : '',
                    shut ? 'other' : ''
                  ].join(' ')}`}
                  data-comment={`cal-day-${iso}`}
                  disabled={shut}
                  title={shut ? 'Non-work day (Settings › Work Days)' : undefined}
                  key={iso}
                  style={
                    overdue && iso !== selected
                      ? { color: 'var(--danger)', fontWeight: 600 }
                      : undefined
                  }
                  onClick={() => setSelected(iso)}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
        <div className='modal-foot' data-comment='calendar-foot'>
          {/* the dedicated Unschedule button is itself the deliberate step — no second confirm */}
          <button
            className='btn btn-ghost'
            data-comment='calendar-unschedule'
            id='calendar-unschedule-btn'
            style={{
              display: ctx?.mode === 'reschedule' ? '' : 'none',
              marginRight: 'auto'
            }}
            onClick={() => {
              if (ctx?.mode !== 'reschedule') return
              onClose()
              unscheduleOrder(ctx.orderId)
            }}
          >
            Unschedule
          </button>
          <button className='btn btn-ghost' data-comment='calendar-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='calendar-set'
            data-comment='calendar-set'
            disabled={!selected}
            onClick={confirm}
          >
            Set date
          </button>
        </div>
      </div>
    </Overlay>
  )
}
