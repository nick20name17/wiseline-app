import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { asAmount, asNumber } from './form'

describe('asAmount', () => {
  it('reads the thousands the shop writes', () => {
    expect(asAmount('18,000')).toBe(18000)
    expect(asAmount('1,250,000')).toBe(1250000)
    expect(asAmount(' 750 ')).toBe(750)
    expect(asAmount('1,200.5')).toBe(1200.5)
    expect(asAmount('0.02')).toBe(0.02)
    expect(asAmount(' 18,000 ')).toBe(18000)
    expect(asAmount('1,200.55')).toBe(1200.55)
  })

  it('leaves an empty box unset', () => {
    expect(asAmount('')).toBeNull()
    expect(asAmount(null)).toBeNull()
  })

  it('refuses a comma that is not a thousands group', () => {
    expect(asAmount('18,5')).toBeNaN()
    expect(asAmount('18,00')).toBeNaN()
    expect(asAmount('0,020')).toBeNaN()
    expect(asAmount('abc')).toBeNaN()
  })
})

describe('a number box', () => {
  it('reads back any amount as the shop prints it, grouped or not', () => {
    const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 })
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 ** 12 }), thousandths => {
        const value = thousandths / 1000
        expect(asAmount(grouped.format(value))).toBe(
          Number(grouped.format(value).replaceAll(',', ''))
        )
        expect(asAmount(String(value))).toBe(value)
      })
    )
  })

  it('leaves a blank box unset and keeps a number it is handed', () => {
    expect(asNumber('   ')).toBeNull()
    expect(asNumber(undefined)).toBeNull()
    expect(asNumber(0)).toBe(0)
    expect(asNumber(' 8.5 ')).toBe(8.5)
  })
})
