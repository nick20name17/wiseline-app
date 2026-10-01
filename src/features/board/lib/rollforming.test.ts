import { describe, expect, it } from 'vitest'
import type { BoardLineItem, BoardOrder } from '../api'
import { coilNumbersOf, productionParts } from './rollforming'

const line = (
  id: string,
  day: string | null,
  patch: { released?: boolean; status?: string | null; machine?: number; coil?: string } = {}
) =>
  ({
    id,
    machine_id: patch.machine ?? 85,
    item: {
      production_date: day,
      is_released: patch.released ?? true,
      status: patch.status ?? null,
      coil_number: patch.coil ?? null
    }
  }) as BoardLineItem

const order = (invoice: string, lines: BoardLineItem[]) =>
  ({ id: invoice, invoice, origin_items: lines, sales_order: null }) as unknown as BoardOrder

describe('productionParts', () => {
  it('lists released, unfinished lines on the machine, a row per day, earliest first', () => {
    const parts = productionParts(
      [
        order('W2', [line('a', '2026-10-02'), line('b', '2026-10-01')]),
        order('W1', [
          line('c', '2026-10-02'),
          line('d', '2026-10-02', { released: false }),
          line('e', '2026-10-02', { status: 'wrapped' }),
          line('f', '2026-10-02', { machine: 71 })
        ])
      ],
      85,
      2
    )
    expect(parts.map(part => [part.day, part.order.invoice, part.lines.map(l => l.id)])).toEqual([
      ['2026-10-01', 'W2', ['b']],
      ['2026-10-02', 'W1', ['c']],
      ['2026-10-02', 'W2', ['a']]
    ])
  })
})

describe('coilNumbersOf', () => {
  it('names each coil once', () => {
    expect(
      coilNumbersOf([
        line('a', null, { coil: 'F1' }),
        line('b', null, { coil: 'F1' }),
        line('c', null, { coil: 'J2' }),
        line('d', null)
      ])
    ).toEqual(['F1', 'J2'])
  })
})
