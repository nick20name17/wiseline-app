import { describe, expect, it } from 'vitest'
import { isLogin } from './login'

describe('isLogin', () => {
  it('takes an email or a login word, as the API does', () => {
    expect(isLogin('kevin@wiseline.app')).toBe(true)
    expect(isLogin('j.smith_2')).toBe(true)
    expect(isLogin('JSmith')).toBe(true)
  })

  it('refuses a broken email, a single letter and other characters', () => {
    expect(isLogin('kevin@')).toBe(false)
    expect(isLogin('j')).toBe(false)
    expect(isLogin('john smith')).toBe(false)
    expect(isLogin('.smith')).toBe(false)
  })
})
