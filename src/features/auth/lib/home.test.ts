import { describe, expect, it } from 'vitest'
import { homePath } from './home.ts'

const user = (role: string, prod_types: string[] = [], process_types: string[] = []) => ({
  role,
  prod_types,
  process_types
})

describe('homePath', () => {
  it('sends a driver to the Driver page', () => {
    expect(homePath(user('driver', [], ['driver']))).toBe('/driver')
  })

  it('sends the roles that run every department to the first board', () => {
    expect(homePath(user('admin'))).toBe('/trim')
    expect(homePath(user('super_manager', [], ['production', 'shipping']))).toBe('/trim')
  })

  it('sends a user to the first of their lines in board order', () => {
    expect(homePath(user('worker', ['Accessories', 'Rollforming'], ['production']))).toBe(
      '/rollforming'
    )
  })

  it('sends a Shipping-only user to Shipping', () => {
    expect(homePath(user('manager', [], ['shipping']))).toBe('/shipping')
  })

  it('sends a user assigned nowhere to the first board, which says whom to ask', () => {
    expect(homePath(user('client'))).toBe('/trim')
  })
})
