import { describe, expect, it } from 'vitest'
import type { Priority } from '../api'
import { reorder } from './reorder'

const priority = (id: number, position: number): Priority => ({
  id,
  name: `P${id}`,
  color: null,
  position,
  department: 1
})

describe('reorder', () => {
  it('renumbers from 1 and returns only the rows whose number changed', () => {
    const list = [priority(1, 1), priority(2, 2), priority(3, 3), priority(4, 4)]

    expect(reorder(list, 3, 1).moved.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: 3, position: 1 },
      { id: 1, position: 2 },
      { id: 2, position: 3 }
    ])
  })

  it('gives the new row order', () => {
    const list = [priority(1, 1), priority(2, 2), priority(3, 3)]

    expect(reorder(list, 1, 3).rows.map(({ id }) => id)).toEqual([2, 3, 1])
  })

  it('closes gaps and duplicates the server left', () => {
    const list = [priority(1, 0), priority(2, 0), priority(3, 7)]

    expect(reorder(list, 1, 2).moved.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: 2, position: 1 },
      { id: 1, position: 2 },
      { id: 3, position: 3 }
    ])
  })

  it('does nothing when dropped where it started', () => {
    expect(reorder([priority(1, 1), priority(2, 2)], 2, 2).moved).toEqual([])
  })
})
