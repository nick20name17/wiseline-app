import { describe, expect, it } from 'vitest'
import type { BoardLineItem, BoardOrder } from '../api'
import { coilNumbersOf, productionParts, runsOffCoil, sourceOf } from './rollforming'

const line = (
  id: string,
  day: string | null,
  patch: {
    released?: boolean
    status?: string | null
    machine?: number
    coil?: string
    supplier?: string
    icon?: string
  } = {}
) =>
  ({
    id,
    machine_id: patch.machine ?? 85,
    item: {
      production_date: day,
      is_released: patch.released ?? true,
      status: patch.status ?? null,
      coil_number: patch.coil ?? null,
      supplier: patch.supplier ?? null,
      coil_icon: patch.icon ?? null
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
          // All of it packed at the machine: Rolled, off the list p2 (1041,510).
          line('g', '2026-10-02', { status: 'rolled' }),
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

describe('the coil of a part rolled partly off a coil and partly slit', () => {
  const lines = [
    line('a', null, { coil: 'F1', icon: 'coil' }),
    line('b', null, { icon: 'waiting_to_slit' })
  ]

  it('reads waiting beside the coil it has', () => {
    expect(coilNumbersOf(lines)).toEqual(['F1', 'waiting...'])
  })

  it('shows the Slit Line until all of it is slit', () => {
    expect(sourceOf(lines)).toBe('waiting_to_slit')
    expect(sourceOf([line('a', null, { icon: 'slit' }), line('b', null, { icon: 'coil' })])).toBe(
      'slit'
    )
    expect(sourceOf([line('a', null, { icon: 'coil' })])).toBe('coil')
  })
})

describe('a Stock line', () => {
  it('names no coil and no source on its part', () => {
    const stock = line('a', null, { status: 'stock', coil: 'F1', icon: 'coil' })
    expect(coilNumbersOf([stock, line('b', null, { coil: 'J2' })])).toEqual(['J2'])
    expect(sourceOf([stock])).toBeNull()
  })
})

describe('runsOffCoil', () => {
  const coil = { supplier: 'COLSTE', coil_number: 'J46A211' } as Parameters<typeof runsOffCoil>[1]

  it('marks a part with a line on the coil in the machine', () => {
    const lines = [line('a', null), line('b', null, { supplier: 'COLSTE', coil: 'J46A211' })]
    expect(runsOffCoil(lines, coil)).toBe(true)
  })

  it('does not mark another coil, a line still at the Slit Line, or an empty machine', () => {
    expect(runsOffCoil([line('a', null, { supplier: 'COLSTE', coil: 'F7601268' })], coil)).toBe(
      false
    )
    expect(
      runsOffCoil(
        [line('a', null, { supplier: 'COLSTE', coil: 'J46A211', icon: 'waiting_to_slit' })],
        coil
      )
    ).toBe(false)
    expect(runsOffCoil([line('a', null, { supplier: 'COLSTE', coil: 'J46A211' })], null)).toBe(
      false
    )
  })
})
