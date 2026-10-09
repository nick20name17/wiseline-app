import { describe, expect, it } from 'vitest'
import type { BoardLineItem, BoardOrder } from '../api'
import { byProduct, materialsOf, newProduct } from './parts'

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
})
