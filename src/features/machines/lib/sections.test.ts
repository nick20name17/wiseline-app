import { describe, expect, it } from 'vitest'
import type { Department, Machine } from '../api'
import { machineSections } from './sections'

const department = (id: number, code: string, position: number) =>
  ({ id, code, name: code, position }) as Department
const machine = (id: number, departmentId: number) => ({ id, department: departmentId }) as Machine

describe('machineSections', () => {
  it('keeps a section per department in board order, in its own unit, empty ones too', () => {
    const sections = machineSections({
      machines: [machine(1, 2), machine(2, 1), machine(3, 2)],
      departments: [
        department(2, 'rollforming', 2),
        department(1, 'trim', 1),
        department(3, 'accessories', 3)
      ]
    })
    expect(
      sections.map(section => [section.code, section.unit, section.machines.map(m => m.id)])
    ).toEqual([
      ['trim', 'bends', [2]],
      ['rollforming', 'feet', [1, 3]],
      ['accessories', 'pieces', []]
    ])
  })

  it('still reaches a machine whose department is gone', () => {
    const sections = machineSections({
      machines: [machine(1, 9)],
      departments: [department(1, 'trim', 1)]
    })
    expect(sections.at(-1)).toMatchObject({
      key: 'none',
      unit: 'pieces',
      machines: [machine(1, 9)]
    })
    expect(sections.at(-1)?.department).toBeUndefined()
    expect(machineSections({ machines: [machine(1, 9)], departments: undefined })).toHaveLength(1)
    expect(
      machineSections({ machines: undefined, departments: [department(1, 'trim', 1)] })
    ).toHaveLength(1)
  })
})
