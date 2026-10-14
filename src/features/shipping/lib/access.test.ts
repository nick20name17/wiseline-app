import { describe, expect, it } from 'vitest'
import { shippingFallback, shippingPages } from './access'

describe('shippingPages', () => {
  it('gives the Manager every window, the Worker Loading, the Driver his own', () => {
    expect(shippingPages('manager', 'manager')).toEqual({
      shipping: true,
      loading: true,
      driver: true
    })
    expect(shippingPages('worker', 'worker')).toEqual({
      shipping: false,
      loading: true,
      driver: false
    })
    expect(shippingPages('driver', null)).toEqual({ shipping: false, loading: false, driver: true })
    expect(shippingPages('client', 'viewer')).toEqual({
      shipping: true,
      loading: false,
      driver: false
    })
  })

  it('shuts every window to someone not in Shipping', () => {
    expect(shippingPages('worker', null)).toEqual({
      shipping: false,
      loading: false,
      driver: false
    })
  })
})

describe('shippingFallback', () => {
  it('never sends someone back to a window they were turned away from', () => {
    expect(shippingFallback('worker', 'worker')).toBe('/loading')
    expect(shippingFallback('driver', null)).toBe('/driver')
    expect(shippingFallback('client', 'viewer')).toBe('/shipping')
    expect(shippingFallback('worker', null)).toBe('/trim')
  })
})
