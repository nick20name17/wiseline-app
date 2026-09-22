import type { Cutlist, CutlistRow, CutlistSource, Machine, TrimLineItem, TrimOrder } from '../api'

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
 */
export const hasSlinetStarted = (slinetList: Cutlist | undefined) =>
  !!slinetList && (!!slinetList.completed_at || slinetList.rows.some(row => row.complete))

/**
 * Whether the Slinet has cut this bendlist line. A machine cannot bend what has not been cut, so its
 * Complete waits on this.
 *
 * No list to look at counts as cut: the Slinet's completed lists are only kept for 90 days, and a
 * list that has aged out of them was cut long ago.
 */
export const isCutForMachine = (
  group: CutlistGroup,
  slinetList: Cutlist | undefined,
  machineId: number
) =>
  !slinetList ||
  !!slinetList.completed_at ||
  slinetList.rows
    .filter(
      row => row.machine === machineId && row.width === group.width && row.length === group.length
    )
    .every(row => row.complete)

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

/** Where a cutlist source's line item lives: the order it belongs to and its own EBMS row. */
type SourceLine = { order: TrimOrder; line: TrimLineItem }

/**
 * A cutlist source names its line only by autoid. The Scheduled tab's orders carry the lines
 * themselves, so they are what answers «whose is this» until the cutlist does (TODO.md).
 */
export const indexLines = (orders: TrimOrder[]) => {
  const lines = new Map<string, SourceLine>()
  for (const order of orders)
    for (const line of order.origin_items) lines.set(line.id, { order, line })
  return lines
}

/**
 * What the Slinet cuts on one day: every piece on that day's cutlists, the ones already Done
 * included — the material was cut either way, and the strip is the day's work, not what is left.
 */
export const slinetTotals = (
  cutlists: Cutlist[],
  day: string,
  isStockOrder: (order: string | null) => boolean
) => {
  let pieces = 0
  let stockPieces = 0

  for (const cutlist of cutlists) {
    if (cutlist.production_date !== day) continue
    for (const row of cutlist.rows) {
      pieces += row.quantity
      for (const source of row.sources)
        if (isStockOrder(source.order)) stockPieces += source.quantity
    }
  }

  return { pieces, stockPieces }
}
