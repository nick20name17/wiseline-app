import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Priority } from '../api'
import { reorder } from './reorder'

const priority = (id: number, department: number | null = 1, position = id): Priority => ({
  id,
  name: `P${id}`,
  color: null,
  position,
  department
})

describe('reorder', () => {
  it('gives the new row order and every one of the department’s ids in it, top first', () => {
    const moved = reorder([priority(1), priority(2), priority(3), priority(4)], 3, 1)

    expect(moved?.rows.map(({ id }) => id)).toEqual([3, 1, 2, 4])
    expect(moved?.ids).toEqual([3, 1, 2, 4])
  })

  it('reorders the hierarchy of the row in hand and leaves the other out of the save', () => {
    const moved = reorder([priority(1), priority(2, null), priority(3)], 1, 3)

    expect(moved?.ids).toEqual([3, 1])
  })

  it('lets a row with no department be dragged among the department’s own', () => {
    // Older priorities predate departments: they are listed with each one's own and must still move.
    const rows = [
      priority(10, null, 1),
      priority(1, 1, 1),
      priority(11, null, 2),
      priority(2, 1, 2)
    ]
    const moved = reorder(rows, 11, 10)

    expect(moved?.ids).toEqual([11, 10])
    expect(moved?.rows.map(({ id }) => id)).toEqual([1, 11, 2, 10])
  })

  it('does nothing when only another hierarchy’s row is passed', () => {
    expect(reorder([priority(1), priority(2, null), priority(3)], 1, 2)).toBeNull()
  })

  it('does nothing when dropped where it started', () => {
    expect(reorder([priority(1), priority(2)], 2, 2)).toBeNull()
  })
})

describe('reorder on any list', () => {
  const lists = fc.uniqueArray(
    fc.record({
      id: fc.integer({ min: 1, max: 30 }),
      department: fc.constantFrom(null, 1),
      position: fc.integer({ min: 1, max: 10 })
    }),
    { selector: row => row.id, minLength: 1, maxLength: 10 }
  )

  const byId = (a: number, b: number) => a - b

  it('does nothing for an id that is not on the list', () => {
    expect(reorder([priority(1), priority(2)], 9, 1)).toBeNull()
    expect(reorder([priority(1), priority(2)], 1, 9)).toBeNull()
  })

  it("moves the row onto the drop, keeps every row, and saves the whole of the row's hierarchy", () => {
    fc.assert(
      fc.property(lists, fc.nat(), fc.nat(), (rows, from, to) => {
        const list = rows.map(row => priority(row.id, row.department, row.position))
        const active = list[from % list.length]!
        const over = list[to % list.length]!
        const moved = reorder(list, active.id, over.id)
        fc.pre(moved !== null)

        const own = list.filter(row => row.department === active.department)
        expect(moved!.department).toBe(active.department)
        expect(moved!.ids.toSorted(byId)).toEqual(own.map(row => row.id).toSorted(byId))
        expect(moved!.rows.map(row => row.id).toSorted(byId)).toEqual(
          list.map(row => row.id).toSorted(byId)
        )
        expect(moved!.ids).not.toEqual(own.map(row => row.id))
        moved!.ids.forEach((id, index) =>
          expect(moved!.rows.find(row => row.id === id)?.position).toBe(index + 1)
        )
      })
    )
  })
})
