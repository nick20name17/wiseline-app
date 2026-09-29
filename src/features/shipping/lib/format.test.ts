import { describe, expect, it } from 'vitest'
import { formatLength, formatWeight, mapUrl } from './format'

describe('shipping formats', () => {
  it('prints a length in feet and inches, and inches', () => {
    expect(formatLength(162)).toBe(`13'6" (162")`)
    expect(formatLength(117.5)).toBe(`9'9.5" (117.5")`)
    expect(formatLength(0)).toBe('—')
  })

  it('prints a weight in pounds', () => {
    expect(formatWeight(1673.49)).toBe('1,673.49 lbs')
  })

  it('searches the address and the city on the map', () => {
    expect(mapUrl('567 George St', 'Woodstock')).toBe(
      'https://www.google.com/maps/search/?api=1&query=567%20George%20St%2C%20Woodstock'
    )
  })
})
