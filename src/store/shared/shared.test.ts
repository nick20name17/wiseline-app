import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * These cover the decisions the prototype makes about payloads it did not write — an older version, a
 * shape from a previous build, a value that looks empty but is not. Everything else about these
 * modules is a `localStorage` round-trip and would only restate itself.
 *
 * The modules are re-imported per test because each store reads its key once, at module load.
 */
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('canonical coils', () => {
  it('refuses a payload written by a different version rather than migrating it', async () => {
    localStorage.setItem(
      'wl_coils_v1',
      JSON.stringify({ version: 3, coils: [{ id: 1, coilNumber: 'C-1' }] })
    )

    const { canonicalCoils } = await import('./coils')
    expect(canonicalCoils.get()).toBeNull()
  })
})

describe('work days', () => {
  it('reads holidays written as bare dates by an older build', async () => {
    localStorage.setItem(
      'wl_workdays_v1',
      JSON.stringify({
        weekdays: [false, true, true, true, true, true, false],
        holidays: [{ date: '2026-07-01', name: 'Canada Day' }, '2026-12-25']
      })
    )

    const { workDays } = await import('./settings')
    expect(workDays.get().holidays).toEqual([
      { date: '2026-07-01', name: 'Canada Day' },
      { date: '2026-12-25', name: '' }
    ])
  })

  it('keeps the default week when the stored one is not seven days', async () => {
    localStorage.setItem('wl_workdays_v1', JSON.stringify({ weekdays: [true, true] }))

    const { workDays } = await import('./settings')
    expect(workDays.get().weekdays).toHaveLength(7)
  })
})

describe('package weight ceiling', () => {
  it('treats a configured zero as "no limit" and not as unset', async () => {
    localStorage.setItem('wl_pkgmax_v1', JSON.stringify({ Trim: 0 }))

    const { maxPackageWeight } = await import('./settings')
    expect(maxPackageWeight('Trim')).toBe(0)
    expect(maxPackageWeight('Rollforming')).toBe(500)
  })
})

describe('shipping state', () => {
  it('separates a package Shipping has not seen from one it has not loaded', async () => {
    localStorage.setItem(
      'wl_ship_state_v1',
      JSON.stringify({ packages: { '01-338001-01': { loaded: false } } })
    )

    const { isPackageLoaded } = await import('./shipping')
    expect(isPackageLoaded('01-338001-01')).toBe(false)
    expect(isPackageLoaded('01-338001-02')).toBeNull()
  })
})
