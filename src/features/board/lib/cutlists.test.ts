import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Cutlist, CutlistRow, CutlistSource, Machine, Remanufacturing } from '../api'
import {
  type CutlistGroup,
  completeBlocker,
  describeGroup,
  doneBlocker,
  drawingOf,
  groupDrawing,
  editableLines,
  groupRows,
  hasSlinetStarted,
  linesOf,
  remakeHold,
  remakeRequestBlocker,
  remakesOf,
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
  product_files: [],
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
  remanufacturing_id: null,
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

describe('groupRows', () => {
  // p1 (650,330): width first, smallest on top, then the shortest length within a width.
  it('sorts by width, then length', () => {
    const groups = groupRows([
      row(1, 1, { width: 14, length: 120 }),
      row(2, 1, { width: 10, length: 198 }),
      row(3, 1, { width: 10, length: 120 }),
      row(4, 1, { width: 12, length: 96 })
    ])

    expect(groups.map(group => `${group.width}x${group.length}`)).toEqual([
      '10x120',
      '10x198',
      '12x96',
      '14x120'
    ])
  })

  // A ticked row comes back from the server after the rest of its size; it keeps its place.
  it('keeps rows of one size in the order they were made', () => {
    const product = (id: number, product_id: string) =>
      row(id, 1, { sources: [source({ origin_item: `${id}`, product_id })] })
    const groups = groupRows([product(7, 'B'), product(3, 'A')], { byProduct: true })

    expect(groups.map(group => group.sources[0]?.product_id)).toEqual(['A', 'B'])
  })

  // p1 (507,291): one line per width and length, its pieces and line items summed in.
  it('combines rows of the same width and length', () => {
    const groups = groupRows([
      row(1, 1, { quantity: 4 }),
      row(2, 2, { quantity: 3, vented: true }),
      row(3, 1, { width: 8, quantity: 1 })
    ])

    expect(groups).toHaveLength(2)
    expect(groups[1]).toMatchObject({ width: 12, length: 120, quantity: 7, vented: 3 })
    expect(groups[1]?.sources.map(line => line.origin_item)).toEqual(['1', '2'])
  })
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
    expect(hasSlinetStarted(list({ rows: [row(1, 1, { complete: true }), row(2, 1)] }), true)).toBe(
      true
    )
    expect(hasSlinetStarted(list({ completed_at: '2026-09-21T16:00:00' }), true)).toBe(true)
  })

  it('counts a missing Slinet list as cut only once the lists have loaded', () => {
    expect(hasSlinetStarted(undefined, true)).toBe(true)
    expect(hasSlinetStarted(undefined, false)).toBe(false)
  })
})

describe('completeBlocker', () => {
  it('never holds a Slinet list: a cut can come off the cutoffs', () => {
    expect(completeBlocker({ isSlinet: true, slinetStarted: false })).toBeNull()
  })

  it('holds a bendlist until the Slinet starts', () => {
    expect(completeBlocker({ isSlinet: false, slinetStarted: false })).toBe(
      'Available once the Slinet starts on this release'
    )
    expect(completeBlocker({ isSlinet: false, slinetStarted: true })).toBeNull()
  })
})

describe('slinetTotals', () => {
  it("counts the day's lists, done ones included, what of them is cut, and the stock-order share", () => {
    const lists = [
      list({
        rows: [
          row(1, 1, { complete: true }),
          row(2, 2, { sources: [source({ order: 'S1', origin_item: '2', is_stock: true })] })
        ]
      }),
      list({
        completed_at: '2026-09-23T12:00:00',
        rows: [row(3, 1, { sources: [source({ order: 'S2', origin_item: '3', is_stock: true })] })]
      }),
      list({ production_date: '2026-09-24', rows: [row(4, 1)] })
    ]

    expect(slinetTotals(lists, '2026-09-23')).toEqual({
      pieces: 12,
      stockPieces: 8,
      cut: 8,
      stockCut: 4
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
      originItem: '1',
      productId: 'TRC8262',
      description: 'Ridge Cap',
      status: 'not_started',
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
      originItem: null,
      productId: null,
      description: 'Ridge Cap',
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

describe('drawings', () => {
  const file = (name: string, url: string | null = `https://r2.test/${name}`) => ({
    id: 1,
    name,
    url
  })

  it('takes the first picture with a link, not an INI or an unsigned file', () => {
    expect(drawingOf([file('system.pdf'), file('a.png', null), file('b.JPG')])?.name).toBe('b.JPG')
    expect(drawingOf([file('notes.pdf')])).toBeNull()
  })

  it('shows a row the drawing of its one product, and none for a row of two', () => {
    const one = groupRows([
      row(1, 1, {
        sources: [source({ product_files: [file('ridge.png')] }), source({ origin_item: '2' })]
      })
    ])[0]!
    expect(groupDrawing(one)?.name).toBe('ridge.png')

    const two = groupRows([
      row(1, 1, {
        sources: [
          source({ product_files: [file('ridge.png')] }),
          source({ origin_item: '2', product_id: 'TED8262' })
        ]
      })
    ])[0]!
    expect(groupDrawing(two)).toBeNull()
  })
})

describe('a bendlist row per product', () => {
  const ridge = row(1, 1, { sources: [source()] })
  const eave = row(2, 1, { sources: [source({ origin_item: '2', product_id: 'TED8262' })] })

  it('keeps two products of one size apart on a bendlist', () => {
    const groups = groupRows([ridge, eave], { byProduct: true })
    expect(groups.map(group => describeGroup(group).productId)).toEqual(['TRC8262', 'TED8262'])
  })

  it('cuts them as one size on the Slinet', () => {
    expect(groupRows([ridge, eave])).toHaveLength(1)
  })
})

const remake = (id: number, extra: Partial<Remanufacturing> = {}): Remanufacturing => ({
  id,
  order: 'A',
  origin_item: '1',
  department: 1,
  source: 'machine',
  remanufacturing_qty: 2,
  pull_from_stock_qty: null,
  note: null,
  is_cut: false,
  is_bent: false,
  requested_by: null,
  requested_at: null,
  cut_by: null,
  cut_machine: null,
  cut_at: null,
  bent_by: null,
  bent_machine: null,
  bent_at: null,
  bend_row_id: null,
  ...extra
})

describe("a remake on the line's own list", () => {
  it("keeps a remake's row beside the line's of the same size, after it", () => {
    const groups = groupRows([row(2, 1, { remanufacturing_id: 7, quantity: 2 }), row(1, 1)])

    expect(groups.map(group => [group.remakeId, group.quantity])).toEqual([
      [null, 4],
      [7, 2]
    ])
  })

  it('finds the remake a row is, the list is, or that rides on the row', () => {
    const [line, own] = groupRows([row(1, 1), row(2, 1, { remanufacturing_id: 7 })])
    const riding = remake(8, { bend_row_id: 1 })
    const all = [remake(7), riding, remake(9)]

    expect(remakesOf(line!, null, all)).toEqual([riding])
    expect(remakesOf(own!, null, all).map(reman => reman.id)).toEqual([7])
    expect(remakesOf(line!, remake(5), all).map(reman => reman.id)).toEqual([5, 8])
    expect(remakesOf(own!, remake(7), all).map(reman => reman.id)).toEqual([7])
  })

  it('holds a bend row until the Slinet cuts its remake, never a Slinet row', () => {
    expect(remakeHold(false, [remake(1)])).toBe('Available once the Slinet cuts the remake')
    expect(remakeHold(false, [remake(1, { is_cut: true })])).toBeNull()
    expect(remakeHold(true, [remake(1)])).toBeNull()
    expect(remakeHold(false, [])).toBeNull()
  })

  it("says Done waits on the remake's row", () => {
    expect(doneBlocker(list({ is_complete: true }))).toBeNull()
    expect(
      doneBlocker(
        list({ rows: [row(1, 1, { complete: true }), row(2, 1, { remanufacturing_id: 7 })] })
      )
    ).toBe('Available once every row is Complete, the remake included')
    expect(doneBlocker(list({ rows: [row(1, 1)] }))).toBe('Available once every row is Complete')
    expect(
      doneBlocker(list({ rows: [row(1, 1), row(2, 1, { remanufacturing_id: 7, complete: true })] }))
    ).toBe('Available once every row is Complete')
  })

  it('asks for a remake only once the Slinet has cut the line', () => {
    expect(remakeRequestBlocker(null)).toBe('Available once the Slinet has cut this line')
    expect(remakeRequestBlocker('not_started')).not.toBeNull()
    expect(remakeRequestBlocker('cut')).toBeNull()
    expect(remakeRequestBlocker('bent')).toBeNull()
  })
})

describe('groupRows on any rows', () => {
  const rowsArb = fc.array(
    fc.record({
      width: fc.constantFrom(null, 8, 12),
      length: fc.constantFrom(null, 96, 120),
      machine: fc.constantFrom(1, 2),
      vented: fc.boolean(),
      quantity: fc.nat(50),
      complete: fc.boolean(),
      is_standard_length: fc.boolean(),
      remanufacturing_id: fc.constantFrom(null, 7),
      sources: fc.array(
        fc.record({
          origin_item: fc.constantFrom(null, '1', '2'),
          order: fc.constantFrom(null, 'A', 'B'),
          quantity: fc.nat(50)
        }),
        { maxLength: 3 }
      )
    }),
    { maxLength: 12 }
  )
  const rank = (group: CutlistGroup) => [
    group.width ?? 0,
    group.length ?? 0,
    Number(group.remakeId !== null)
  ]
  const byRank = (a: number[], b: number[]) => a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!
  const keyOf = (line: CutlistSource) => line.origin_item ?? `order:${line.order ?? ''}`

  const toRows = (
    specs: (Partial<Omit<CutlistRow, 'sources'>> & { sources: Partial<CutlistSource>[] })[]
  ) =>
    specs.map((spec, index) =>
      row(index + 1, 1, { ...spec, sources: spec.sources.map(extra => source(extra)) })
    )

  it('puts every row in exactly one line, losing no piece', () => {
    fc.assert(
      fc.property(rowsArb, fc.boolean(), (specs, byProduct) => {
        const rows = toRows(specs)
        const groups = groupRows(rows, { byProduct })
        const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

        expect(groups.flatMap(group => group.rows.map(r => r.id)).sort((a, b) => a - b)).toEqual(
          rows.map(r => r.id)
        )
        expect(sum(groups.map(group => group.quantity))).toBe(sum(rows.map(r => r.quantity)))
        for (const group of groups) {
          expect(group.quantity).toBe(sum(group.rows.map(r => r.quantity)))
          expect(group.vented).toBe(sum(group.rows.filter(r => r.vented).map(r => r.quantity)))
          expect(group.complete).toBe(group.rows.every(r => r.complete))
          expect(group.isStandardLength).toBe(group.rows.every(r => r.is_standard_length))
          expect(group.sources).toEqual(group.rows.flatMap(r => r.sources))
          for (const r of group.rows) {
            expect([r.width, r.length, r.remanufacturing_id]).toEqual([
              group.width,
              group.length,
              group.remakeId
            ])
          }
        }
      })
    )
  })

  it('keeps sizes apart and in order: width, length, then the remake after the line', () => {
    fc.assert(
      fc.property(rowsArb, specs => {
        const groups = groupRows(toRows(specs))
        const sizes = groups.map(group => `${group.width}|${group.length}|${group.remakeId}`)

        expect(new Set(sizes).size).toBe(sizes.length)
        expect(groups.map(rank)).toEqual(groups.map(rank).toSorted(byRank))
      })
    )
  })

  it("sums a line's share across the rows it sits under", () => {
    fc.assert(
      fc.property(rowsArb, specs => {
        for (const group of groupRows(toRows(specs))) {
          const lines = linesOf(group)

          expect(new Set(lines.map(keyOf)).size).toBe(lines.length)
          for (const line of lines) {
            const behind = group.sources.filter(other => keyOf(other) === keyOf(line))
            expect(line.quantity).toBe(behind.reduce((total, other) => total + other.quantity, 0))
          }
        }
      })
    )
  })
})
