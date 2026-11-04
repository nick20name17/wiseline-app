import { describe, expect, it } from 'vitest'
import { monthStart, periodOf, remakePeriod } from './period'

describe('periodOf', () => {
  it('is this month so far when the link names no day', () => {
    expect(periodOf(undefined, undefined, '2026-11-04')).toEqual({
      from: '2026-11-01',
      to: '2026-11-04'
    })
  })

  it('starts on the 1st of the month the end is in', () => {
    expect(periodOf(undefined, '2026-09-15', '2026-11-04')).toEqual({
      from: '2026-09-01',
      to: '2026-09-15'
    })
  })

  it('puts ends named backwards the right way round', () => {
    expect(periodOf('2026-10-20', '2026-10-02', '2026-11-04')).toEqual({
      from: '2026-10-02',
      to: '2026-10-20'
    })
  })
})

describe('remakePeriod', () => {
  it('runs to the midnight after the last day, across a month and a year', () => {
    expect(remakePeriod({ from: '2026-11-01', to: '2026-11-30' })).toEqual({
      created_at__gte: '2026-11-01T00:00:00',
      created_at__lt: '2026-12-01T00:00:00'
    })
    expect(remakePeriod({ from: '2026-12-31', to: '2026-12-31' }).created_at__lt).toBe(
      '2027-01-01T00:00:00'
    )
  })
})

describe('monthStart', () => {
  it('is the 1st', () => {
    expect(monthStart('2026-02-28')).toBe('2026-02-01')
  })
})
