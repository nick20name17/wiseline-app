import type { Cutlist, CutlistRow, CutlistSource, Machine, ProductFile } from '../api'

/**
 * One line of the table the worker reads: a width and a length, and every row the server holds for
 * that size behind it.
 *
 * The Slinet's cutlist carries a row per machine — and a separate one for the vented pieces — because
 * that is how the material is routed. The board reads those sideways instead: one line per size, with
 * the machines as columns. Marking that line complete is therefore marking every row under it.
 */
export type CutlistGroup = {
  key: string
  width: number | null
  length: number | null
  rows: CutlistRow[]
  quantity: number
  vented: number
  complete: boolean
  isStandardLength: boolean
  sources: CutlistSource[]
}

/**
 * The line items behind a row, one entry each: a line can sit under several of the row's own rows — a
 * machine's pieces and its vented ones — and its share is summed across them.
 */
export const linesOf = (group: CutlistGroup) => {
  const lines = new Map<string, CutlistSource>()
  for (const source of group.sources) {
    const key = source.origin_item ?? `order:${source.order ?? ''}`
    const seen = lines.get(key)
    lines.set(key, seen ? { ...seen, quantity: seen.quantity + source.quantity } : source)
  }
  return [...lines.values()]
}

/**
 * The lines behind a row that an edit can still reach: a source outlives its line item, and one whose
 * item is gone has nothing left to patch.
 */
export const editableLines = (group: CutlistGroup) =>
  linesOf(group).filter(
    (line): line is CutlistSource & { item_id: number } => line.item_id !== null
  )

/**
 * What a bendlist row says about the trim: the line's own figures when one line is behind it, the
 * sums when several orders' pieces were cut as one. A description or status the lines disagree on is
 * `null` — the row cannot speak for all of them.
 */
export const describeGroup = (group: CutlistGroup) => {
  const lines = linesOf(group)
  const same = <T>(pick: (line: CutlistSource) => T) => {
    const values = new Set(lines.map(pick))
    return values.size === 1 ? ([...values][0] ?? null) : null
  }
  return {
    lines: lines.length,
    // The one line item behind the row — what a remake or a note thread is asked against.
    originItem: lines.length === 1 ? (lines[0]?.origin_item ?? null) : null,
    productId: same(line => line.product_id),
    description: same(line => line.description),
    status: same(line => line.status),
    ordered: lines.reduce((total, line) => total + (line.qty_ordered ?? 0), 0),
    fromStock: lines.reduce((total, line) => total + (line.pull_from_stock ?? 0), 0),
    isStock: lines.some(line => line.is_stock)
  }
}

// EBMS keeps more than pictures on a product; only these can stand in a table cell.
const IMAGE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i

/** The product's drawing: its first picture that has a link, or `null` for none. */
export const drawingOf = (files: ProductFile[]) =>
  files.find(file => file.url && IMAGE.test(file.name)) ?? null

/**
 * The drawing a bendlist row shows — the product's, when one product is behind the row. A row cutting
 * two products of the same size cannot show either; its lines are opened through the Total.
 */
export const groupDrawing = (group: CutlistGroup) =>
  describeGroup(group).productId === null
    ? null
    : drawingOf(linesOf(group).flatMap(line => line.product_files))

/** What one machine's column holds on a Slinet line: its pieces, vented ones left out of it. */
export const machineQuantity = (group: CutlistGroup, machineId: number) =>
  group.rows
    .filter(row => row.machine === machineId && !row.vented)
    .reduce((total, row) => total + row.quantity, 0)

/**
 * `byProduct` keeps a bendlist's products apart: the server gives each product of a size its own row,
 * with its own ID, Drawing and Complete p1 (653,304), where the Slinet cuts one size for them all.
 */
export const groupRows = (rows: CutlistRow[], { byProduct = false } = {}): CutlistGroup[] => {
  const groups = new Map<string, CutlistGroup>()

  for (const row of rows) {
    const product = byProduct ? (row.sources[0]?.product_id ?? '') : ''
    const key = `${row.width ?? ''}|${row.length ?? ''}|${product}`
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        width: row.width,
        length: row.length,
        rows: [],
        quantity: 0,
        vented: 0,
        complete: true,
        isStandardLength: true,
        sources: []
      }
      groups.set(key, group)
    }
    group.rows.push(row)
    group.quantity += row.quantity
    if (row.vented) group.vented += row.quantity
    group.complete &&= row.complete
    group.isStandardLength &&= row.is_standard_length
    group.sources.push(...row.sources)
  }

  // "Primarily sorted by width and then length. The smallest width goes on top."
  return [...groups.values()].sort(
    (a, b) => (a.width ?? 0) - (b.width ?? 0) || (a.length ?? 0) - (b.length ?? 0)
  )
}

/**
 * The Slinet's list each bendlist was cut from. One release makes one Slinet list per gauge/colour and
 * one bendlist per machine under it, so the release time alone would tie a bendlist to every colour
 * released with it. Where a list appears twice the first copy wins, so the caller puts first the one
 * it trusts.
 */
export const slinetListsFor = (slinetLists: Cutlist[]) => {
  const key = (list: Cutlist) => `${list.released_at}|${list.gauge_color}`
  const byRelease = new Map<string, Cutlist>()
  for (const list of slinetLists) if (!byRelease.has(key(list))) byRelease.set(key(list), list)
  return (bendlist: Cutlist) => byRelease.get(key(bendlist))
}

/**
 * «In progress» on a bendlist: the first cut is what starts it, and nothing after that un-starts it —
 * a Slinet list marked Done is the one that has cut the most.
 *
 * Once the Slinet lists have loaded, no list to look at means it aged out of the 90 days the
 * completed ones are kept for — cut long ago. Before they have loaded it means nothing yet.
 */
export const hasSlinetStarted = (slinetList: Cutlist | undefined, loaded: boolean) =>
  slinetList ? !!slinetList.completed_at || slinetList.rows.some(row => row.complete) : loaded

/**
 * The machines that bend. The Slinet cuts every trim and Wrapping comes after all of them, so neither
 * is a station a trim is routed to.
 */
export const isBender = (machine: Machine) =>
  machine.kind !== 'cutting' && machine.kind !== 'wrapping'

type SlinetColumn = { kind: 'machine'; machine: Machine } | { kind: 'vented' }

/**
 * The Slinet's columns: every bending machine in its own order, with Vented slotted in straight
 * after the rollformer, which is where the board draws it — «P.B. | V1 | V2 | Rollformer | Vented |
 * Caps | Flat Stock».
 */
export const slinetColumns = (machines: Machine[]): SlinetColumn[] => {
  const columns: SlinetColumn[] = machines.map(machine => ({ kind: 'machine', machine }))
  const rollformer = machines.findLastIndex(machine => machine.kind === 'rollforming')
  columns.splice(rollformer === -1 ? columns.length : rollformer + 1, 0, { kind: 'vented' })
  return columns
}

/**
 * What the Slinet cuts on one day: every piece on that day's cutlists, the ones already Done
 * included — the material was cut either way, and the strip is the day's work, not what is left.
 */
export const slinetTotals = (cutlists: Cutlist[], day: string) => {
  let pieces = 0
  let stockPieces = 0

  for (const cutlist of cutlists) {
    if (cutlist.production_date !== day) continue
    for (const row of cutlist.rows) {
      pieces += row.quantity
      for (const source of row.sources) if (source.is_stock) stockPieces += source.quantity
    }
  }

  return { pieces, stockPieces }
}

/**
 * Why an open row on a list cannot be ticked Complete yet, or `null` when it can.
 *
 * Nothing is cut without a coil of the list's colour in the Slinet: once the last one is depleted, the
 * Worker checks another in before the list can go on p1 (502,469). A bendlist is Not Started until the
 * Slinet cuts into its release; from then on a row can be signed off before its own piece is cut, and
 * Bent overrides Cut (p1 (686,329)).
 */
export const completeBlocker = ({
  isSlinet,
  slinetStarted,
  color,
  coilsInSlinet
}: {
  isSlinet: boolean
  slinetStarted: boolean
  color: string | null
  /**
   * `'checking'` while the answer is on its way; `null` when it is not asked — a done list, or a read
   * that failed, which should not lock the floor out of its work.
   */
  coilsInSlinet: number | 'checking' | null
}) => {
  if (!isSlinet) return slinetStarted ? null : 'Available once the Slinet starts on this release'
  if (coilsInSlinet === 'checking') return 'Checking the coils in the Slinet…'
  return coilsInSlinet === 0 ? `Check a ${color ?? 'matching'} coil into the Slinet first` : null
}
