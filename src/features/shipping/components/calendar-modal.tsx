import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { dateOverdue } from '../selectors'
import { shippingStore, TODAY } from '../store'

/** Whoever opened the picker says what it is for and takes the day back. */
export type CalCtx = { desc: string; preset: string | null; onSet: (iso: string) => void }

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

/**
 * The shared Ship Date picker.
 *
 * Every day of the month is pickable, including a past one — dispatch backdates a load that went out
 * before it was entered. An overdue day is marked rather than blocked, and that mark is why the grid
 * still reads the board's orders.
 *
 * #129 closed the production calendars on days Settings › Work Days marks non-work; this one stays open
 * deliberately. Work Days is «include it in the production schedule» — it says when the shop makes
 * things, not when a truck may leave, and a load that went out on a Saturday still has to be enterable.
 */
export const CalendarModal = ({ ctx, onClose }: { ctx: CalCtx | null; onClose: () => void }) => {
  const orders = useStore(shippingStore, state => state.orders)
  const [month, setMonth] = useState(6)
  const [year, setYear] = useState(2026)
  const [selected, setSelected] = useState(ctx?.preset ?? null)

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

  return (
    <Overlay id='overlay-calendar' comment='overlay-calendar' open={!!ctx} onClose={onClose}>
      <div className='modal' data-comment='calendar-modal' data-component='dialog'>
        <ModalHead
          comment='calendar-head'
          titleComment='calendar-title'
          descComment='calendar-desc'
          title='Set Ship Date'
          desc={ctx?.desc ?? 'Choose the ship date.'}
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
              const cls = [
                date === TODAY ? 'today' : '',
                dateOverdue(date, orders) ? 'overdue' : '',
                date === selected ? 'selected' : ''
              ].join(' ')

              return (
                <button
                  className={`cal-day ${cls}`}
                  data-comment={`cal-day-${date}`}
                  onClick={() => setSelected(date)}
                  key={date}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
        </div>
        <div className='modal-foot' data-comment='calendar-foot'>
          <button className='btn btn-ghost' data-comment='calendar-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='calendar-set'
            data-comment='calendar-set'
            disabled={!selected}
            onClick={() => {
              if (!selected) return
              ctx?.onSet(selected)
              onClose()
            }}
          >
            Set date
          </button>
        </div>
      </div>
    </Overlay>
  )
}
