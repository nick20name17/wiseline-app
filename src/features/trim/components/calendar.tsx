import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

import { useState } from 'react'

import { useStore } from '@/store/create-store'
import { isWorkDay } from '@/store/shared/settings'

import { fmtDate } from '../format'
import {
  isOverdue,
  lineDay,
  priorityById,
  scheduledDays,
  scheduledOrders,
  isReleased,
  isReviewed,
  totalDailyCap
} from '../selectors'
import { setScheduledDay, TODAY, trimStore } from '../store'

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

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ordersOnDay = (iso: string) =>
  scheduledOrders().filter(order => order.lineItems.some(item => lineDay(order, item) === iso))

/**
 * The full month grid, N-157/162: pick any day and see what is assigned to it, including the days the
 * Scheduled tab's rolling window never reaches. Work days come from Settings › Work Days; the rest are
 * greyed but still pickable, because a non-work day can still carry work that slipped onto it.
 *
 * The month and the picked day are local state, not store state — the prototype keeps them in three
 * module variables beside this one render function, and nothing else on the page reads them.
 */
export const Calendar = () => {
  useStore(trimStore, current => current)

  const [year, setYear] = useState(() => Number(TODAY.slice(0, 4)))
  const [month, setMonth] = useState(() => Number(TODAY.slice(5, 7)) - 1)
  const [selected, setSelected] = useState(TODAY)

  const byDate = new Map(scheduledDays().map(day => [day.date, day]))
  const dayCap = totalDailyCap()
  const startDow = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  const shift = (delta: number) => {
    const next = month + delta
    if (next < 0) {
      setMonth(11)
      setYear(year - 1)
    } else if (next > 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(next)
    }
  }

  const today = () => {
    setYear(Number(TODAY.slice(0, 4)))
    setMonth(Number(TODAY.slice(5, 7)) - 1)
    setSelected(TODAY)
  }

  const dayOrders = ordersOnDay(selected)
  const openInScheduled = () => setScheduledDay(selected)

  return (
    <div className='caltab' data-comment='cal-wrap'>
      <div className='caltab-cal' data-comment='cal-monthcard'>
        <div className='caltab-head' data-comment='cal-monthhead'>
          <div className='caltab-title' data-comment='cal-monthtitle'>
            {MONTHS[month]} {year}
          </div>
          <div className='caltab-nav' data-comment='cal-monthnav'>
            <button className='btn btn-sm' data-comment='cal-today' onClick={today}>
              Today
            </button>
            <button
              className='caltab-navbtn'
              data-comment='cal-prev'
              aria-label='Previous month'
              onClick={() => shift(-1)}
            >
              <ChevronLeft style={{ width: '16px', height: '16px', pointerEvents: 'none' }} />
            </button>
            <button
              className='caltab-navbtn'
              data-comment='cal-next'
              aria-label='Next month'
              onClick={() => shift(1)}
            >
              <ChevronRight style={{ width: '16px', height: '16px', pointerEvents: 'none' }} />
            </button>
          </div>
        </div>

        <div className='caltab-grid' data-comment='cal-grid'>
          {DOW.map((label, index) => (
            <div className='caltab-dow' key={label} data-comment={`cal-dow-${index}`}>
              {label}
            </div>
          ))}

          {Array.from({ length: startDow }, (_, index) => (
            <div
              className='caltab-cell blank'
              key={`blank-${index}`}
              data-comment={`cal-blank-${index}`}
            />
          ))}

          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1
            const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const info = byDate.get(iso)
            const count = info ? info.orders : 0
            const classes = [
              'caltab-cell',
              iso === TODAY ? 'today' : '',
              iso === selected ? 'selected' : '',
              isWorkDay(iso) ? '' : 'nonwork',
              isOverdue(iso) && count > 0 ? 'overdue' : ''
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                className={classes}
                key={iso}
                data-comment={`cal-cell-${iso}`}
                onClick={() => setSelected(iso)}
              >
                <span className='caltab-cell-num' data-comment={`cal-cellnum-${iso}`}>
                  {day}
                </span>
                {count ? (
                  <span
                    className='caltab-cell-badge'
                    data-comment={`cal-cellbadge-${iso}`}
                    title={`${info?.bends} / ${dayCap} bends`}
                  >
                    {count} ord
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className='caltab-day' data-comment='cal-daycard'>
        <div className='caltab-day-head' data-comment='cal-day-head'>
          <div>
            <div className='caltab-day-title' data-comment='cal-day-title'>
              {fmtDate(selected)}
              {selected === TODAY ? ' · today' : ''}
            </div>
            <div className='caltab-day-sub' data-comment='cal-day-sub'>
              {dayOrders.length} order{dayOrders.length === 1 ? '' : 's'} scheduled
              {isWorkDay(selected) ? '' : ' · non-work day'}
            </div>
          </div>
          {dayOrders.length ? (
            <button className='btn btn-sm' data-comment='cal-day-open' onClick={openInScheduled}>
              <ArrowRight style={{ width: '14px', height: '14px' }} />
              Open in Scheduled
            </button>
          ) : null}
        </div>

        {dayOrders.length ? (
          <div className='caltab-day-list' data-comment='cal-day-list'>
            {dayOrders.map(order => {
              const priority = priorityById(order.priorityId)

              return (
                <button
                  className='caltab-day-row'
                  key={order.id}
                  data-comment={`cal-dayrow-${order.id}`}
                  onClick={openInScheduled}
                >
                  <span
                    className='caltab-dayrow-order mono'
                    data-comment={`cal-dayrow-order-${order.id}`}
                  >
                    {order.order}
                  </span>
                  <span className='caltab-dayrow-cust' data-comment={`cal-dayrow-cust-${order.id}`}>
                    {order.customer}
                  </span>
                  {priority ? (
                    <span className='caltab-dayrow-pri' data-comment={`cal-dayrow-pri-${order.id}`}>
                      {/* the prototype reaches for a `color` a priority does not carry, so the dot
                          keeps its stylesheet colour on both sides */}
                      <span className='pri-dot' />
                      {priority.name}
                    </span>
                  ) : null}
                  <span
                    className='caltab-dayrow-state'
                    data-comment={`cal-dayrow-state-${order.id}`}
                  >
                    {isReleased(order) ? 'Released' : isReviewed(order) ? 'Reviewed' : 'Scheduled'}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className='caltab-day-empty' data-comment='cal-day-empty'>
            Nothing scheduled for this day.
          </div>
        )}
      </div>
    </div>
  )
}
