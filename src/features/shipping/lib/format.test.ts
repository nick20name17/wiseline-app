import { describe, expect, it } from 'vitest'
import { formatLength, formatWeight, mapUrl, routeUrl } from './format'

describe('shipping formats', () => {
  it('prints a length in feet and inches, and inches', () => {
    expect(formatLength(162)).toBe(`13'6" (162")`)
    expect(formatLength(117.5)).toBe(`9'9.5" (117.5")`)
    expect(formatLength(0)).toBe('—')
  })

  it('prints a weight in pounds, and a dash for none', () => {
    expect(formatWeight(1673.49)).toBe('1,673.49 lbs')
    expect(formatWeight(null)).toBe('—')
  })

  it('searches the address and the city on the map', () => {
    expect(mapUrl('567 George St', 'Woodstock')).toBe(
      'https://www.google.com/maps/search/?api=1&query=567%20George%20St%2C%20Woodstock'
    )
  })

  it('runs the directions from the warehouse through every stop', () => {
    const url = new URL(
      routeUrl([
        { address: '1 Yard Rd', city: 'Aylmer', state: 'ON' },
        { address: '45 Yarmouth Road', city: 'St Thomas', state: 'ON' },
        { address: null, city: 'London', state: null },
        { address: '567 George St', city: 'Woodstock' }
      ])!
    )
    expect(url.searchParams.get('origin')).toBe('1 Yard Rd, Aylmer, ON')
    expect(url.searchParams.get('waypoints')).toBe('45 Yarmouth Road, St Thomas, ON|London')
    expect(url.searchParams.get('destination')).toBe('567 George St, Woodstock')
    expect(routeUrl([{ address: '1 Yard Rd', city: 'Aylmer' }])).toBeNull()
  })
})
