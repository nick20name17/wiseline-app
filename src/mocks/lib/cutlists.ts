import { machines } from '../seed/machines'
import { now, stamp } from './dates'
import { lines, orders } from './state'
import { ensureDeptState, needOf } from './model'
import type { Line } from './types'

type Share = { line: Line; quantity: number }

export type CutRow = {
  id: number
  width: number | null
  length: number | null
  machine: number | null
  vented: boolean
  quantity: number
  operator_notes: string | null
  shares: Share[]
}

export type CutList = {
  id: number
  kind: 'cutlist' | 'bendlist'
  machine: number | null
  production_date: string | null
  gauge: string | null
  color: string | null
  priority: number | null
  released_at: string
  completed_at: string | null
  is_complete: boolean
  is_remanufacture: boolean
  remanufacturing_id: number | null
  rows: CutRow[]
}

export const cutlists: CutList[] = []

const counters = { list: 100, row: 1000 }

const slinet = () => machines.find(row => row.department === 1 && row.kind === 'cutting')
const bending = () => machines.filter(row => row.department === 1 && row.kind === 'bending')

const machineOf = (line: Line) => line.item?.flow ?? bending()[0]?.id ?? null

const BENT = ['bent', 'in_progress', 'wrapped', 'stock']
const CUT = ['cut', ...BENT]

/** A row is done once every line behind it has moved past the machine's step. */
export const rowComplete = (list: CutList, row: CutRow) =>
  row.shares.every(share =>
    (list.kind === 'cutlist' ? CUT : BENT).includes(share.line.item?.status ?? '')
  )

const rowsOf = (shares: Share[], kind: 'cutlist' | 'bendlist') => {
  const rows = new Map<string, CutRow>()
  for (const share of shares) {
    const { line } = share
    const machine = machineOf(line)
    const vented = !!line.item?.vented
    const key = [line.width, line.length, kind === 'cutlist' ? machine : 0, vented].join('|')
    const row = rows.get(key) ?? {
      id: ++counters.row,
      width: line.width,
      length: line.length,
      machine,
      vented,
      quantity: 0,
      operator_notes: null,
      shares: []
    }
    row.quantity += share.quantity
    row.shares.push(share)
    rows.set(key, row)
  }
  return [...rows.values()].toSorted((a, b) => (b.length ?? 0) - (a.length ?? 0))
}

const make = (
  kind: CutList['kind'],
  machine: number | null,
  shares: Share[],
  head: Line,
  priority: number | null,
  extra: Partial<CutList> = {}
) => {
  const list: CutList = {
    id: ++counters.list,
    kind,
    machine,
    production_date: head.item?.production_date ?? null,
    gauge: head.gauge,
    color: head.color,
    priority,
    released_at: now(),
    completed_at: null,
    is_complete: false,
    is_remanufacture: false,
    remanufacturing_id: null,
    rows: rowsOf(shares, kind),
    ...extra
  }
  cutlists.push(list)
  return list
}

/**
 * One Slinet list and a bendlist per machine for lines released together, grouped by day, gauge,
 * colour and priority — released again later, the same group makes a second list beside the first.
 */
export const createCutlists = (released: Line[]) => {
  const made: number[] = []
  const groups = new Map<string, Line[]>()
  for (const line of released.filter(row => row.dept === 1 && needOf(row) > 0)) {
    const order = orders.find(row => row.id === line.order)
    const priority = order?.states[1]?.priority ?? null
    const key = [line.item?.production_date, line.gauge, line.color, priority].join('|')
    groups.set(key, [...(groups.get(key) ?? []), line])
  }
  for (const group of groups.values()) {
    const head = group[0]
    if (!head) continue
    const order = orders.find(row => row.id === head.order)
    const priority = order ? (ensureDeptState(order, 1).priority ?? null) : null
    const shares = group.map(line => ({ line, quantity: needOf(line) }))
    made.push(make('cutlist', slinet()?.id ?? null, shares, head, priority).id)
    for (const machine of bending()) {
      const mine = shares.filter(share => machineOf(share.line) === machine.id)
      if (mine.length) made.push(make('bendlist', machine.id, mine, head, priority).id)
    }
  }
  return made
}

export const createRemakeCutlists = (line: Line, quantity: number, remanId: number) => {
  const order = orders.find(row => row.id === line.order)
  const priority = order?.states[1]?.priority ?? null
  const shares = [{ line, quantity }]
  const extra = { is_remanufacture: true, remanufacturing_id: remanId }
  make('cutlist', slinet()?.id ?? null, shares, line, priority, extra)
  make('bendlist', machineOf(line), shares, line, priority, extra)
}

/** Lists already worked through at the plant as the lines' statuses say they are. */
export const buildSeedCutlists = () => {
  createCutlists(lines.filter(line => line.item?.is_released && !line.item.bypassed))
  for (const list of cutlists) {
    const allDone = list.rows.every(row => rowComplete(list, row))
    const past =
      list.kind === 'bendlist' ||
      list.rows.every(row => row.shares.every(s => BENT.includes(s.line.item?.status ?? '')))
    list.is_complete = allDone && past
    if (list.is_complete) list.completed_at = stamp(1, 14, 5)
    list.released_at = stamp(1, 7, 30)
  }
}
