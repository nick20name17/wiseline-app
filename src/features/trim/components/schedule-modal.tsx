import { useState } from 'react'
import { CalendarX, ChevronLeft, ChevronRight } from 'lucide-react'

import { isWorkDay } from '@/store/shared/settings'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { scheduledDays, totalDailyCap } from '../selectors'
import { TODAY } from '../store'

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

/**
 * What the calendar is being asked for. The prototype keeps one modal and one context variable for
 * all five, which is why the title, the button and whether Unschedule shows all move together.
 */
export type ScheduleCtx =
  | { mode: 'entire'; orderIds: number[]; orderCount: number }
  | {
      mode: 'split'
      orderId: number
      lineIds: number[]
      lineCount: number
      total: number
      order: string
    }
  | { mode: 'reschedule'; orderId: number; order: string; current: string | null }
  | { mode: 'peek'; current: string | null }
  | { mode: 'jump'; current: string | null }

const copy = (ctx: ScheduleCtx) => {
  if (ctx.mode === 'peek')
    return {
      title: 'Show another day',
      desc: 'Pin any day beside the five work days to see the bends already scheduled to it.',
      action: 'Show day'
    }
  if (ctx.mode === 'jump')
    return {
      title: 'Jump to a day',
      desc: 'Focus the board on a production day.',
      action: 'Go to day'
    }
  if (ctx.mode === 'reschedule')
    return {
      title: `Reschedule order ${ctx.order}`,
      desc: 'Pick any production day. Rescheduling resets Manager edits.',
      action: 'Reschedule'
    }
  if (ctx.mode === 'split')
    return {
      title: 'Set production date',
      desc: `Splitting ${ctx.lineCount} of ${ctx.total} line items from ${ctx.order} to a production date.`,
      action: 'Set date'
    }

  return {
    title: 'Set production date',
    desc: `Scheduling ${ctx.orderCount} order${ctx.orderCount > 1 ? 's' : ''} entirely.`,
    action: 'Set date'
  }
}

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/**
 * The month grid every scheduling decision goes through.
 *
 * Each day carries the Trim day budget — bends already scheduled against the plant's daily capacity —
 * because the question being answered is never «which date» on its own, it is «which date has room».
 * Non-work days come from Settings › Work Days and are greyed but still pickable: work does slip onto
 * them, and the board has to be able to say so.
 *
 * Past days are closed except when the board is only looking (peek, jump), where an overdue day is
 * exactly what someone wants to focus on.
 */
export const ScheduleModal = ({
  ctx,
  onClose,
  onPick,
  onUnschedule
}: {
  ctx: ScheduleCtx | null
  onClose: () => void
  onPick: (ctx: ScheduleCtx, iso: string) => void
  onUnschedule: (orderId: number) => void
}) => {
  const current = ctx && 'current' in ctx ? ctx.current : null
  const [selected, setSelected] = useState<string | null>(current)
  const [year, setYear] = useState(() => Number((current ?? TODAY).slice(0, 4)))
  const [month, setMonth] = useState(() => Number((current ?? TODAY).slice(5, 7)) - 1)

  const text = ctx ? copy(ctx) : { title: 'Set production date', desc: '', action: 'Set date' }
  const allowPast = ctx?.mode === 'peek' || ctx?.mode === 'jump'

  const bendsByDay = new Map(scheduledDays().map(day => [day.date, day.bends]))
  const dayCap = totalDailyCap()

  const startDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()

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

  return (
    <Overlay id='overlay-calendar' comment='overlay-calendar' open={!!ctx} onClose={onClose}>
      <div className='modal' data-comment='calendar-modal' data-component='dialog'>
        <ModalHead
          comment='calendar-head'
          titleComment='calendar-title'
          descComment='calendar-desc'
          title={text.title}
          desc={text.desc}
          onClose={onClose}
        />
        <div className='modal-body' data-comment='calendar-body'>
          <div className='cal-head' data-comment='calendar-monthbar'>
            <button
              className='cal-nav'
              data-comment='calendar-prev'
              aria-label='Previous month'
              onClick={() => shift(-1)}
            >
              <ChevronLeft style={{ width: '14px', height: '14px' }} />
            </button>
            <div className='cal-month' id='cal-month' data-comment='calendar-month'>
              {MONTHS[month]} {year}
            </div>
            <button
              className='cal-nav'
              data-comment='calendar-next'
              aria-label='Next month'
              onClick={() => shift(1)}
            >
              <ChevronRight style={{ width: '14px', height: '14px' }} />
            </button>
          </div>

          <div className='cal-grid' id='cal-grid' data-comment='calendar-grid'>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
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
              const past = date < TODAY
              const bends = bendsByDay.get(date) ?? 0
              const workDay = isWorkDay(date)
              const over = dayCap > 0 && bends > dayCap

              const title = workDay
                ? `${bends} of ${dayCap} bends scheduled${over ? ' — over the daily capacity' : ''}`
                : 'Non-work day (Settings › Work Days)'

              return (
                <button
                  className={`cal-day ${date === TODAY ? 'today' : ''} ${date === selected ? 'selected' : ''} ${past ? 'other' : ''} ${workDay ? '' : 'nonwork'}`}
                  data-comment={`cal-day-${date}`}
                  title={past && !allowPast ? `Past date · ${title}` : title}
                  disabled={past && !allowPast}
                  onClick={() => setSelected(date)}
                  key={date}
                >
                  {index + 1}
                  <span
                    className={`cal-day-bends${over ? ' over' : ''}`}
                    data-comment={`cal-day-bends-${date}`}
                  >
                    {workDay ? `${bends} / ${dayCap}` : '—'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className='modal-foot' data-comment='calendar-foot'>
          {ctx?.mode === 'reschedule' ? (
            <button
              className='btn'
              id='calendar-unschedule'
              data-comment='calendar-unschedule'
              style={{ marginRight: 'auto' }}
              onClick={() => onUnschedule(ctx.orderId)}
            >
              <CalendarX style={{ width: '14px', height: '14px' }} />
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
            onClick={() => ctx && selected && onPick(ctx, selected)}
          >
            {text.action}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
