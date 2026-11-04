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
  it('runs from the shop’s midnight to the one after the last day, across a month and a year', () => {
    expect(remakePeriod({ from: '2026-10-01', to: '2026-10-31' })).toEqual({
      created_at__gte: '2026-10-01T04:00:00.000Z',
      created_at__lt: '2026-11-01T04:00:00.000Z'
    })
    expect(remakePeriod({ from: '2026-12-31', to: '2026-12-31' }).created_at__lt).toBe(
      '2027-01-01T05:00:00.000Z'
    )
  })

  it('takes each end’s own offset when the clocks change between them', () => {
    // Daylight time ends at 2:00 on Nov 1, 2026: that day starts on EDT, the next on EST.
    expect(remakePeriod({ from: '2026-11-01', to: '2026-11-01' })).toEqual({
      created_at__gte: '2026-11-01T04:00:00.000Z',
      created_at__lt: '2026-11-02T05:00:00.000Z'
    })
    // It starts at 2:00 on Mar 8, 2026.
    expect(remakePeriod({ from: '2026-03-08', to: '2026-03-08' })).toEqual({
      created_at__gte: '2026-03-08T05:00:00.000Z',
      created_at__lt: '2026-03-09T04:00:00.000Z'
    })
  })
})

describe('monthStart', () => {
  it('is the 1st', () => {
    expect(monthStart('2026-02-28')).toBe('2026-02-01')
  })
})
