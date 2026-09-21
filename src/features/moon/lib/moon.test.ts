import { describe, expect, test } from 'vitest'
import { getMoonPhase, parseDayParam, toDayParam } from './moon.ts'

// USNO instants. The mean synodic model drifts up to ~0.5 day, i.e. ~0.017 of a cycle.
const NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14))
const FULL_MOON = new Date(Date.UTC(2024, 0, 25, 17, 54))
const CYCLE_TOLERANCE = 0.02

describe('getMoonPhase', () => {
  test('reference new moon', () => {
    expect(getMoonPhase(NEW_MOON).phase).toBeCloseTo(0, 3)
  })

  test('reference full moon', () => {
    const { phase, name } = getMoonPhase(FULL_MOON)
    expect(Math.abs(phase - 0.5)).toBeLessThan(CYCLE_TOLERANCE)
    expect(name).toBe('Full moon')
  })

  test('next events are after the given date', () => {
    const date = new Date(Date.UTC(2026, 8, 21))
    const { nextNewMoon, nextFullMoon } = getMoonPhase(date)
    expect(nextNewMoon.getTime()).toBeGreaterThan(date.getTime())
    expect(nextFullMoon.getTime()).toBeGreaterThan(date.getTime())
  })
})

describe('day param', () => {
  // Offsets differ either side of DST, so these instants fail if the parse ever goes UTC.
  test('parses to local midnight, winter offset', () => {
    expect(parseDayParam('2026-03-29')?.toISOString()).toBe('2026-03-28T22:00:00.000Z')
  })

  test('parses to local midnight, summer offset', () => {
    expect(parseDayParam('2026-07-01')?.toISOString()).toBe('2026-06-30T21:00:00.000Z')
  })

  test.each(['2026-03-29', '2026-10-25', '2024-02-29'])('round-trips %s', value => {
    expect(toDayParam(parseDayParam(value)!)).toBe(value)
  })

  test.each(['2026-02-31', '2026-13-01', '2026-1-1', 'today'])('rejects %s', value => {
    expect(parseDayParam(value)).toBeUndefined()
  })
})
