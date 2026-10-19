import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { byDay, formatDate, formatDayLabel, formatLongDate, fromIsoDay, toIsoDay } from './days'

// Every day from 1970 to 2100: a production day is any of them.
const isoDays = fc
  .date({
    min: new Date('1970-01-01T00:00:00Z'),
    max: new Date('2100-12-31T00:00:00Z'),
    noInvalidDate: true
  })
  .map(date => date.toISOString().slice(0, 10))

describe('production days', () => {
  it('print the day they name, whatever the zone', () => {
    // TZ is Europe/Kyiv in the tests: a day read as local midnight would print the day before in UTC.
    expect(formatDate('2026-05-07')).toBe('Thu, May 7, 2026')
    expect(formatLongDate('2026-07-14')).toBe('Tue, July 14, 2026')
    expect(formatDayLabel('2026-01-01')).toBe('Thu, Jan 1')
    expect(formatDate(null)).toBe('—')
  })

  it('come back from a picked date as the same day', () => {
    fc.assert(
      fc.property(isoDays, iso => {
        expect(toIsoDay(fromIsoDay(iso))).toBe(iso)
      })
    )
  })

  it('print the same day of the month they name', () => {
    fc.assert(
      fc.property(isoDays, iso => {
        expect(formatLongDate(iso)).toContain(
          ` ${Number(iso.slice(8, 10))}, ${Number(iso.slice(0, 4))}`
        )
      })
    )
  })
})

describe('byDay', () => {
  it('cuts a sorted list into one run per day, losing and reordering nothing', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom('2026-10-01', '2026-10-02', null)), raw => {
        const items = raw.map((date, index) => ({ date, index }))
        const days = byDay(items, item => item.date)
        expect(days.flatMap(day => day.items)).toEqual(items)
        for (const day of days) expect(day.items.every(item => item.date === day.date)).toBe(true)
        for (let i = 1; i < days.length; i++) expect(days[i]!.date).not.toBe(days[i - 1]!.date)
      })
    )
  })
})
