import { describe, expect, it } from 'vitest'
import { asAmount } from './form'

describe('asAmount', () => {
  it('reads the thousands the shop writes', () => {
    expect(asAmount('18,000')).toBe(18000)
    expect(asAmount('1,250,000')).toBe(1250000)
    expect(asAmount(' 750 ')).toBe(750)
    expect(asAmount('1,200.5')).toBe(1200.5)
    expect(asAmount('0.02')).toBe(0.02)
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
