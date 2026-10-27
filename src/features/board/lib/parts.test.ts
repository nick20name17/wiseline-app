import { describe, expect, it } from 'vitest'
import type { BoardLineItem, BoardOrder } from '../api'
import {
  byProduct,
  materialsOf,
  newProduct,
  partDays,
  partLines,
  partState,
  splitOf,
  toMake
} from './parts'

const line = (
  id: string,
  product: string,
  length: number,
  gauge: string | null,
  color: string | null
) => ({ id, id_inven: product, length, gauge, color }) as BoardLineItem

describe('Rollforming lines', () => {
  const lines = [
    line('a', 'MTR8378', 70, '29', 'Burnished Slate'),
    line('b', 'MTR8262', 88, '29', 'Black'),
    line('c', 'MTR8262', 36, '29', 'Black '),
    line('d', 'MTR8306', 36, null, null)
  ]

  it('run by Product ID, then Length, with a line where the Product ID changes', () => {
    const rows = [...lines].sort(byProduct)
    expect(rows.map(row => row.id)).toEqual(['c', 'b', 'd', 'a'])
    expect(rows.map((_, index) => newProduct(rows, index))).toEqual([false, false, true, true])
  })

  it('name each material once, gauge first, and skip a line with none', () => {
    expect(materialsOf({ origin_items: lines } as BoardOrder)).toEqual([
      '29 Ga Burnished Slate',
      '29 Ga Black'
    ])
  })

  it('name a material by its gauge or its colour alone when it has only one', () => {
    expect(
      materialsOf({
        origin_items: [line('a', 'P', 1, '26', null), line('b', 'P', 1, null, 'Red')]
      } as BoardOrder)
    ).toEqual(['26 Ga', 'Red'])
  })

  it('run the lengths of one product shortest first', () => {
    const rows = [
      line('a', 'P', 120, null, null),
      line('b', 'P', 36, null, null),
      line('c', 'P', 88, null, null)
    ]
    expect(rows.sort(byProduct).map(row => row.length)).toEqual([36, 88, 120])
  })
})

type Day = {
  production_date: string | null
  reviewed?: boolean
  is_released?: boolean
  exported_at?: string | null
}

const dated = (id: string, item: Day | null) =>
  ({ id, quantity: 5, item: item && { pull_from_stock: 0, ...item } }) as unknown as BoardLineItem

const order = (
  items: BoardLineItem[],
  {
    count = items.length,
    state = null
  }: {
    count?: number
    state?: {
      production_date: string | null
      reviewed: boolean
      release_to_production: boolean
    } | null
  } = {}
) =>
  ({
    origin_items: items,
    count_items: count,
    sales_order: { is_stock: false, department_states: state ? [{ department: 1, ...state }] : [] }
  }) as unknown as BoardOrder

describe('parts of an order', () => {
  it("reads an order as split, partial or whole by its lines' days", () => {
    expect(
      splitOf(
        order([
          dated('a', { production_date: '2026-10-01' }),
          dated('b', { production_date: '2026-10-01' })
        ])
      )
    ).toBeNull()
    expect(
      splitOf(
        order([
          dated('a', { production_date: '2026-10-01' }),
          dated('b', { production_date: '2026-10-02' })
        ])
      )
    ).toBe('split')
    expect(splitOf(order([dated('a', { production_date: '2026-10-01' }), dated('b', null)]))).toBe(
      'partial'
    )
    expect(splitOf(order([dated('a', null), dated('b', null)]))).toBeNull()
  })

  it('reads an order the tab handed over in part as partial', () => {
    const state = { production_date: '2026-10-01', reviewed: false, release_to_production: false }
    expect(splitOf(order([dated('a', null)], { count: 2, state }))).toBe('partial')
    expect(splitOf(order([dated('a', null)], { count: 2 }))).toBeNull()
  })

  it("lists an order's days earliest first, or the department's day when its lines carry none", () => {
    const state = { production_date: '2026-09-30', reviewed: false, release_to_production: false }
    expect(
      partDays(
        order(
          [
            dated('a', { production_date: '2026-10-02' }),
            dated('b', null),
            dated('c', { production_date: '2026-10-01' })
          ],
          { state }
        ),
        1
      )
    ).toEqual(['2026-10-01', '2026-10-02'])
    expect(partDays(order([dated('a', null)], { state }), 1)).toEqual(['2026-09-30'])
    expect(partDays(order([dated('a', null)], { state }), 2)).toEqual([])
  })

  it("moves a part's own lines, or the whole order when no line has a day", () => {
    const split = order([
      dated('a', { production_date: '2026-10-01' }),
      dated('b', null),
      dated('c', { production_date: '2026-10-02' })
    ])
    expect(partLines(split, '2026-10-01').map(item => item.id)).toEqual(['a'])
    const whole = order([dated('a', null), dated('b', null)])
    expect(partLines(whole, '2026-10-01').map(item => item.id)).toEqual(['a', 'b'])
  })

  it('reviews a part once every line is, releases it once any is', () => {
    const day = '2026-10-01'
    const part = (...items: Day[]) =>
      partState(order(items.map((item, index) => dated(`${index}`, item))), day, 1)
    expect(
      part(
        { production_date: day, reviewed: true, is_released: false },
        { production_date: day, reviewed: false, is_released: true }
      )
    ).toEqual({
      reviewed: false,
      released: true,
      exported: false
    })
    expect(
      part(
        { production_date: day, reviewed: true, exported_at: '2026-10-01T10:00:00' },
        { production_date: day, reviewed: true }
      )
    ).toEqual({
      reviewed: true,
      released: false,
      exported: true
    })
  })

  it("falls back on the order's state while its lines have no app row", () => {
    const state = { production_date: '2026-10-01', reviewed: true, release_to_production: true }
    expect(partState(order([dated('a', null)], { state }), '2026-10-01', 1)).toEqual({
      reviewed: true,
      released: true,
      exported: false
    })
    expect(partState(order([dated('a', null)]), '2026-10-01', 1)).toEqual({
      reviewed: false,
      released: false,
      exported: false
    })
  })

  it('makes what was ordered less what comes from stock', () => {
    expect(toMake({ quantity: 10, item: { pull_from_stock: 3 } } as unknown as BoardLineItem)).toBe(
      7
    )
    expect(toMake({ quantity: 10, item: null } as unknown as BoardLineItem)).toBe(10)
  })
})
