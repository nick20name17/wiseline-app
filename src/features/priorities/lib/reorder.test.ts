import { describe, expect, it } from 'vitest'
import type { Priority } from '../api'
import { reorder } from './reorder'

const priority = (id: number, department: number | null = 1): Priority => ({
  id,
  name: `P${id}`,
  color: null,
  position: id,
  department
})

describe('reorder', () => {
  it('gives the new row order and every one of the department’s ids in it, top first', () => {
    const moved = reorder([priority(1), priority(2), priority(3), priority(4)], 1, 3, 1)

    expect(moved?.rows.map(({ id }) => id)).toEqual([3, 1, 2, 4])
    expect(moved?.ids).toEqual([3, 1, 2, 4])
  })

  it('leaves the other hierarchy out of the save', () => {
    const moved = reorder([priority(1), priority(2, null), priority(3)], 1, 1, 3)

    expect(moved?.rows.map(({ id }) => id)).toEqual([2, 3, 1])
    expect(moved?.ids).toEqual([3, 1])
  })

  it('reorders the priorities with no department as a hierarchy of their own', () => {
    const moved = reorder(
      [priority(1, null), priority(2, null), priority(3, null), priority(4)],
      null,
      3,
      1
    )

    expect(moved?.ids).toEqual([3, 1, 2])
    expect(moved?.changed).toEqual([
      { id: 3, position: 1 },
      { id: 1, position: 2 },
      { id: 2, position: 3 }
    ])
  })

  it('names only the rows whose number moved', () => {
    const moved = reorder([priority(1, null), priority(2, null), priority(3, null)], null, 2, 3)

    expect(moved?.changed).toEqual([
      { id: 3, position: 2 },
      { id: 2, position: 3 }
    ])
  })

  it('does nothing when only another hierarchy’s row is passed', () => {
    expect(reorder([priority(1), priority(2, null), priority(3)], 1, 1, 2)).toBeNull()
  })

  it('does nothing when dropped where it started', () => {
    expect(reorder([priority(1), priority(2)], 1, 2, 2)).toBeNull()
  })
})
