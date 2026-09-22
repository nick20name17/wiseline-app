import type { Cutlist, CutlistRow, CutlistSource } from '../api'

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
