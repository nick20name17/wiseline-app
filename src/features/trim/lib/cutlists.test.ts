import { describe, expect, it } from 'vitest'
import type { Cutlist, CutlistRow, Machine } from '../api'
import {
  groupRows,
  hasSlinetStarted,
  isCutForMachine,
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
  sources: [{ order: 'A', origin_item: `${id}`, quantity: 4 }],
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
  const [group] = groupRows([row(10, 1)])

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
    expect(hasSlinetStarted(list({ rows: [row(1, 1)] }))).toBe(false)
    expect(hasSlinetStarted(list({ rows: [row(1, 1, { complete: true })] }))).toBe(true)
    expect(hasSlinetStarted(list({ completed_at: '2026-09-21T16:00:00' }))).toBe(true)
  })

  it('waits on the Slinet row of the same size and machine', () => {
    const slinet = list({ rows: [row(1, 1), row(2, 2, { complete: true })] })

    expect(isCutForMachine(group!, slinet, 1)).toBe(false)
    expect(isCutForMachine(group!, slinet, 2)).toBe(true)
    expect(isCutForMachine(group!, undefined, 1)).toBe(true)
  })
})

describe('slinetTotals', () => {
  it("counts the day's lists, done ones included, and the stock-order share of them", () => {
    const lists = [
      list({
        rows: [row(1, 1), row(2, 2, { sources: [{ order: 'S1', origin_item: '2', quantity: 4 }] })]
      }),
      list({ completed_at: '2026-09-23T12:00:00', rows: [row(3, 1)] }),
      list({ production_date: '2026-09-24', rows: [row(4, 1)] })
    ]

    expect(slinetTotals(lists, '2026-09-23', order => order === 'S1')).toEqual({
      pieces: 12,
      stockPieces: 4
    })
  })
})
