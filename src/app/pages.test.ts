import { describe, expect, it } from 'vitest'
import { homeOf, type PageAccess } from './pages'

const access = (...open: (keyof PageAccess)[]): PageAccess => ({
  '/trim': open.includes('/trim'),
  '/rollforming': open.includes('/rollforming'),
  '/accessories': open.includes('/accessories'),
  '/shipping': open.includes('/shipping'),
  '/loading': open.includes('/loading'),
  '/driver': open.includes('/driver'),
  '/settings': open.includes('/settings')
})

describe('homeOf', () => {
  it('starts a user on the first board they work', () => {
    expect(homeOf(access('/accessories', '/rollforming'))).toBe('/rollforming')
  })

  it('starts someone on no board on the first Shipping page they have', () => {
    expect(homeOf(access('/loading'))).toBe('/loading')
    expect(homeOf(access('/driver'))).toBe('/driver')
    expect(homeOf(access('/shipping', '/loading', '/driver'))).toBe('/shipping')
  })

  it('never starts anyone on Settings', () => {
    expect(homeOf(access('/settings', '/driver'))).toBe('/driver')
  })

  it('sends someone who may open nothing to Trim, whose board says whom to ask', () => {
    expect(homeOf(access())).toBe('/trim')
  })
})
