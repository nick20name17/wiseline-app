import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/** Local, not UTC: the highlighted day should be the day the person is having. */
const todayIso = () => {
  const now = new Date()
  return iso(now.getFullYear(), now.getMonth(), now.getDate())
}

const label = (date: string) => {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

type PickerState = {
  anchor: HTMLElement
  selected?: string | null
  isMarked?: (date: string) => boolean
  onPick: (date: string) => void
}

/**
 * The prototype's own calendar, used everywhere in place of `<input type="date">`.
 *
 * It is not a stylistic preference: a native picker renders in the browser's locale and chrome, so
 * two machines would not agree on what the screen looks like, and the prototype is the specification
 * for what it looks like.
 */
export const useDatePicker = () => {
  const [picker, setPicker] = useState<PickerState | null>(null)

  const closePicker = useCallback(() => setPicker(null), [])
  const openPicker = useCallback((state: PickerState) => setPicker(state), [])

  return {
    openPicker,
    closePicker,
    pickerNode: picker ? <DatePicker picker={picker} onClose={closePicker} /> : null
  }
}

const DatePicker = ({ picker, onClose }: { picker: PickerState; onClose: () => void }) => {
  const base = picker.selected || todayIso()
  const [year, setYear] = useState(() => +base.slice(0, 4))
  const [month, setMonth] = useState(() => +base.slice(5, 7) - 1)
  const [element, setElement] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      const target = event.target as Node
      if (element?.contains(target) || picker.anchor.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [element, onClose, picker.anchor])

  const root = document.getElementById('root')
  if (!root) return null

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
  const prevDaysInMonth = new Date(year, month, 0).getDate()
  const today = todayIso()

  const rect = picker.anchor.getBoundingClientRect()
  const left = Math.min(
    window.scrollX + rect.left,
    window.scrollX + window.innerWidth - (element?.offsetWidth ?? 0) - 10
  )

  return createPortal(
    <div
      className='dp-pop'
      data-comment='datepicker-pop'
      data-component='dialog'
      ref={setElement}
      style={{ top: `${window.scrollY + rect.bottom + 6}px`, left: `${Math.max(8, left)}px` }}
    >
      <div className='dp-head' data-comment='dp-head'>
        <button
          className='dp-nav'
          data-comment='dp-prev'
          aria-label='Previous month'
          onClick={() => shift(-1)}
        >
          <ChevronLeft style={{ width: '15px', height: '15px', pointerEvents: 'none' }} />
        </button>
        <span className='dp-month' data-comment='dp-month'>
          {MONTHS[month]} {year}
        </span>
        <button
          className='dp-nav'
          data-comment='dp-next'
          aria-label='Next month'
          onClick={() => shift(1)}
        >
          <ChevronRight style={{ width: '15px', height: '15px', pointerEvents: 'none' }} />
        </button>
      </div>
      <div className='dp-grid' data-comment='dp-grid'>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div className='dp-dow' data-comment={`dp-dow-${index}`} key={index}>
            {day}
          </div>
        ))}
        {Array.from({ length: startDow }, (_, index) => (
          <button className='dp-day other' disabled data-comment={`dp-prev-${index}`} key={index}>
            {prevDaysInMonth - startDow + index + 1}
          </button>
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = iso(year, month, index + 1)
          const marked = picker.isMarked?.(date)

          return (
            <button
              className={['dp-day', date === today ? 'today' : '', marked ? 'marked' : '']
                .filter(Boolean)
                .join(' ')}
              data-comment={`dp-day-${date}`}
              title={`${label(date)}${marked ? ' · holiday' : ''}`}
              onClick={() => {
                onClose()
                picker.onPick(date)
              }}
              key={date}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
    </div>,
    root
  )
}
