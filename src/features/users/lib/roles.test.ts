import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DEPARTMENTS, roleLabel, roleTint, toDepartments, toUserTypes } from './roles'

describe('roles', () => {
  it('name and tint a known role, and still render an unknown one', () => {
    expect(roleLabel('client')).toBe('View only')
    expect(roleLabel('super_manager')).toBe('Super manager')
    expect(roleLabel('foreman')).toBe('foreman')
    expect(roleLabel('')).toBe('—')
    expect(roleTint('admin')).toBe('bg-purple-100 text-purple-700')
    expect(roleTint('foreman')).toBe('bg-muted text-muted-foreground')
  })

  it('keep a driver to the Driver page and an admin to no list', () => {
    expect(toUserTypes('driver', ['Trim', 'Shipping'])).toEqual({
      prod_types: [],
      process_types: ['driver']
    })
    expect(toUserTypes('admin', ['Trim'])).toEqual({ prod_types: [], process_types: [] })
  })

  it('watch every line for a super manager, Shipping only if picked', () => {
    expect(toUserTypes('super_manager', ['Trim', 'Shipping'])).toEqual({
      prod_types: [],
      process_types: ['production', 'shipping']
    })
    expect(toUserTypes('super_manager', ['Shipping'])).toEqual({
      prod_types: [],
      process_types: ['shipping']
    })
  })

  it('read back the departments a manager, worker or viewer was saved with', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('manager', 'worker', 'client'),
        fc.subarray([...DEPARTMENTS]),
        (role, departments) => {
          const types = toUserTypes(role, departments)
          expect(toDepartments(types)).toEqual(departments)
          expect(types.process_types.includes('production')).toBe(types.prod_types.length > 0)
        }
      )
    )
  })
})
