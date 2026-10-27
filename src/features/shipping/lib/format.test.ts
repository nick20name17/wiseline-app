import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { formatLength, formatWeight, mapUrl, routeUrl } from './format'

describe('shipping formats', () => {
  it('prints a length in feet and inches, and inches', () => {
    expect(formatLength(162)).toBe(`13'6" (162")`)
    expect(formatLength(117.5)).toBe(`9'9.5" (117.5")`)
    expect(formatLength(0)).toBe('—')
    expect(formatLength(null)).toBe('—')
    expect(formatLength(23.97)).toBe(`2'0" (23.97")`)
  })

  it('never prints twelve inches or more past the feet, and loses no length', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 ** 6 }), hundredths => {
        const inches = hundredths / 100
        const [, feet, rest] = /^(\d+)'([\d.]+)" /.exec(formatLength(inches))!
        expect(Number(rest)).toBeLessThan(12)
        expect(Math.abs(Number(feet) * 12 + Number(rest) - inches)).toBeLessThanOrEqual(0.05 + 1e-9)
      })
    )
  })

  it('prints a weight in pounds, and a dash for none', () => {
    expect(formatWeight(1673.49)).toBe('1,673.49 lbs')
    expect(formatWeight(null)).toBe('—')
  })

  it('searches the whole address on the map', () => {
    expect(
      mapUrl({
        address: '3464 Concession 3',
        city: 'Harrow',
        state: 'ON',
        zip: 'N0R 1G0',
        country: '   '
      })
    ).toBe(
      'https://www.google.com/maps/search/?api=1&query=3464%20Concession%203%2C%20Harrow%2C%20ON%2C%20N0R%201G0'
    )
    expect(mapUrl({ address: '567 George St', city: 'Woodstock' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=567%20George%20St%2C%20Woodstock'
    )
  })

  it('runs the directions from the warehouse through every stop', () => {
    const url = new URL(
      routeUrl([
        {
          address: '1 Yard Rd',
          city: 'Aylmer',
          state: 'ON',
          zip: 'N5H 2R5',
          country: 'CANADA  '
        },
        { address: '45 Yarmouth Road', city: 'St Thomas', state: 'ON' },
        { address: null, city: 'London', state: null },
        { address: '567 George St', city: 'Woodstock' }
      ])!
    )
    expect(url.searchParams.get('origin')).toBe('1 Yard Rd, Aylmer, ON, N5H 2R5, CANADA')
    expect(url.searchParams.get('waypoints')).toBe('45 Yarmouth Road, St Thomas, ON|London')
    expect(url.searchParams.get('destination')).toBe('567 George St, Woodstock')
    expect(routeUrl([{ address: '1 Yard Rd', city: 'Aylmer' }])).toBeNull()
    expect(
      routeUrl([
        { address: '1 Yard Rd', city: 'Aylmer' },
        { address: ' ', city: null }
      ])
    ).toBeNull()
  })

  it('runs two stops straight, with no waypoints', () => {
    const url = new URL(
      routeUrl([
        { address: '1 Yard Rd', city: 'Aylmer' },
        { address: '567 George St', city: 'Woodstock' }
      ])!
    )
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.has('waypoints')).toBe(false)
  })
})
