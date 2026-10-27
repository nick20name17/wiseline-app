import { describe, expect, it } from 'vitest'
import { departmentRole } from './departments'

describe('departmentRole', () => {
  it('lets the roles that run every department in as Manager', () => {
    expect(departmentRole('admin', null)).toBe('manager')
    expect(departmentRole('super_manager', 'worker')).toBe('manager')
  })

  it('lets View only read every board, assigned or not', () => {
    expect(departmentRole('client', null)).toBe('viewer')
  })

  it('reads everyone else off their assignment to the department', () => {
    expect(departmentRole('manager', 'worker')).toBe('worker')
    expect(departmentRole('worker', 'manager')).toBe('manager')
    expect(departmentRole('manager', null)).toBeNull()
  })
})
