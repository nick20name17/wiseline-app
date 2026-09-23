import type { Cutlist, CutlistRow, CutlistSource, Machine } from '../api'

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

/** What one machine's column holds on a Slinet line: its pieces, vented ones left out of it. */
export const machineQuantity = (group: CutlistGroup, machineId: number) =>
  group.rows
    .filter(row => row.machine === machineId && !row.vented)
    .reduce((total, row) => total + row.quantity, 0)

export const groupRows = (rows: CutlistRow[]): CutlistGroup[] => {
  const groups = new Map<string, CutlistGroup>()

  for (const row of rows) {
    const key = `${row.width ?? ''}|${row.length ?? ''}`
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
 * The lists arrive in the board's order — production date, then priority, then gauge/colour — so the
 * days fall out of the sequence and need only be cut where the date changes.
 */
export const byDay = (cutlists: Cutlist[]) => {
  const days: { date: string | null; cutlists: Cutlist[] }[] = []

  for (const cutlist of cutlists) {
    const last = days[days.length - 1]
    if (last && last.date === cutlist.production_date) last.cutlists.push(cutlist)
    else days.push({ date: cutlist.production_date, cutlists: [cutlist] })
  }

  return days
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
