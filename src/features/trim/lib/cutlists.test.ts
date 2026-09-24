import { describe, expect, it } from 'vitest'
import type { Cutlist, CutlistRow, CutlistSource, Machine } from '../api'
import {
  describeGroup,
  editableLines,
  groupRows,
  hasSlinetStarted,
  slinetColumns,
  slinetListsFor,
  slinetTotals
} from './cutlists'

const machine = (id: number, kind: string): Machine => ({
  id,
  name: `M${id}`,
  department: 1,
  position: id,
  kind,
  daily_max_pieces: null,
  daily_max_bends: null
})

const source = (extra: Partial<CutlistSource> = {}): CutlistSource => ({
  order: 'A',
  order_number: 'A',
  customer: null,
  po_number: null,
  origin_item: '1',
  quantity: 4,
  item_id: 1,
  product_id: 'TRC8262',
  description: 'Ridge Cap',
  qty_ordered: 4,
  pull_from_stock: 0,
  status: 'not_started',
  is_stock: false,
  ...extra
})

const row = (id: number, machineId: number, extra: Partial<CutlistRow> = {}): CutlistRow => ({
  id,
  width: 12,
  length: 120,
  machine: machineId,
  vented: false,
  quantity: 4,
  complete: false,
  operator_notes: null,
  is_standard_length: true,
  sources: [source({ origin_item: `${id}` })],
  ...extra
})

const list = (extra: Partial<Cutlist> = {}): Cutlist => ({
  id: 1,
  department: 1,
  kind: 'cutlist',
  machine: null,
  production_date: '2026-09-23',
  gauge: '26ga',
  color: 'Charcoal',
  gauge_color: '26ga - Charcoal',
  priority: null,
  released_at: '2026-09-21T09:00:00',
  completed_at: null,
  is_complete: false,
  is_remanufacture: false,
  remanufacturing_id: null,
  rows: [],
  ...extra
})

describe('slinetColumns', () => {
  it('puts Vented straight after the rollformer', () => {
    const columns = slinetColumns([
      machine(1, 'bending'),
      machine(2, 'rollforming'),
      machine(3, 'bending')
    ])

    expect(columns).toEqual([
      { kind: 'machine', machine: machine(1, 'bending') },
      { kind: 'machine', machine: machine(2, 'rollforming') },
      { kind: 'vented' },
      { kind: 'machine', machine: machine(3, 'bending') }
    ])
  })

  it('ends with Vented when there is no rollformer', () => {
    expect(slinetColumns([machine(1, 'bending')]).at(-1)).toEqual({ kind: 'vented' })
  })
})

describe('the Slinet gate on a bendlist', () => {
  const bendlist = list({ id: 2, kind: 'bendlist', machine: 1 })

  it('ties a bendlist to the Slinet list of its own colour, not every list of the release', () => {
    const other = list({ id: 3, gauge_color: '26ga - Bright White' })
    const own = list({ id: 4 })

    expect(slinetListsFor([other, own])(bendlist)).toBe(own)
  })

  it('prefers the first copy of a list that appears twice', () => {
    const done = list({ id: 4, completed_at: '2026-09-21T16:00:00' })

    expect(slinetListsFor([done, list({ id: 4 })])(bendlist)).toBe(done)
  })

  it('stays in progress once the Slinet list is done', () => {
    expect(hasSlinetStarted(list({ rows: [row(1, 1)] }), true)).toBe(false)
    expect(hasSlinetStarted(list({ rows: [row(1, 1, { complete: true })] }), true)).toBe(true)
    expect(hasSlinetStarted(list({ completed_at: '2026-09-21T16:00:00' }), true)).toBe(true)
  })

  it('counts a missing Slinet list as cut only once the lists have loaded', () => {
    expect(hasSlinetStarted(undefined, true)).toBe(true)
    expect(hasSlinetStarted(undefined, false)).toBe(false)
  })
})

describe('slinetTotals', () => {
  it("counts the day's lists, done ones included, and the stock-order share of them", () => {
    const lists = [
      list({
        rows: [
          row(1, 1),
          row(2, 2, { sources: [source({ order: 'S1', origin_item: '2', is_stock: true })] })
        ]
      }),
      list({ completed_at: '2026-09-23T12:00:00', rows: [row(3, 1)] }),
      list({ production_date: '2026-09-24', rows: [row(4, 1)] })
    ]

    expect(slinetTotals(lists, '2026-09-23')).toEqual({
      pieces: 12,
      stockPieces: 4
    })
  })
})

describe('describeGroup', () => {
  it('speaks for the one line behind a row, its vented share summed in', () => {
    const [group] = groupRows([
      row(1, 1, {
        quantity: 3,
        sources: [source({ quantity: 3, qty_ordered: 5, pull_from_stock: 1 })]
      }),
      row(2, 1, {
        vented: true,
        quantity: 1,
        sources: [source({ quantity: 1, qty_ordered: 5, pull_from_stock: 1 })]
      })
    ])

    expect(describeGroup(group!)).toMatchObject({
      lines: 1,
      productId: 'TRC8262',
      ordered: 5,
      fromStock: 1,
      isStock: false
    })
  })

  it('sums several lines and leaves what they disagree on blank', () => {
    const [group] = groupRows([
      row(1, 1, {
        sources: [
          source({ origin_item: '1', qty_ordered: 4, status: 'cut' }),
          source({ origin_item: '2', product_id: 'TED8262', qty_ordered: 6, is_stock: true })
        ]
      })
    ])

    expect(describeGroup(group!)).toMatchObject({
      lines: 2,
      productId: null,
      status: null,
      ordered: 10,
      isStock: true
    })
  })
})

describe('editableLines', () => {
  it('leaves out a line whose item is gone', () => {
    const [group] = groupRows([
      row(1, 1, {
        sources: [source({ origin_item: '1' }), source({ origin_item: '2', item_id: null })]
      })
    ])

    expect(editableLines(group!).map(line => line.origin_item)).toEqual(['1'])
  })
})
