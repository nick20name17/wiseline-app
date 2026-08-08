import { isWorkDay } from '@/store/shared/settings'

import { TODAY, trimStore } from './store'

import type { LineItem, Note, Order, Priority } from './types'

/**
 * How many bends a profile takes is a property of the profile, not of the order: the Machine Capacities
 * report counts Pieces and Bends as different metrics (#174), and Trim's capacity is bends per day
 * (#173). A profile that is not listed counts as one bend.
 */
const BENDS_PER: Record<string, number> = {
  TSWB262: 3,
  TDRIP24: 2,
  TRAKE24: 3,
  TVAL26: 2,
  TGABLE26: 4,
  TRIDGE26: 4,
  TDE8262: 3,
  TWCAP24: 5,
  TCORN26: 2
}

/** Stock covers part of the order, so only the remainder is manufactured. */
export const qtyToMake = (item: LineItem) => Math.max(0, item.qty - (item.fromStock || 0))

export const lineBends = (item: LineItem) => qtyToMake(item) * (BENDS_PER[item.productId] || 1)

/**
 * The production day of a single line (#172). Only a split order carries per-line dates; a plain
 * order's lines all follow the order's own date. `null` means still unscheduled.
 */
export const lineDay = (order: Order, item: LineItem) =>
  item.scheduledDate || (order.isSplit ? null : order.productionDate)

/**
 * An order stays in Unscheduled while *any* of its lines has no day — so a split order whose remaining
 * trim has since been scheduled leaves the tab on its own (#172).
 */
export const unscheduledOrders = () =>
  trimStore.get().orders.filter(order => order.lineItems.some(item => !lineDay(order, item)))

export const scheduledOrders = () =>
  trimStore.get().orders.filter(order => order.productionDate && !order.completed)

export const priorityById = (id: number | null): Priority | null =>
  trimStore.get().priorities.find(priority => priority.id === id) ?? null

/** The plant's daily ceiling — the `Y` in every `(X / Y)` glance. */
export const totalDailyCap = () =>
  trimStore.get().machines.reduce((sum, machine) => sum + (machine.dailyMax || 0), 0)

export const noteState = (notes: Note[] | undefined) => {
  if (!notes?.length) return 'none'
  return notes.some(note => !note.dealt) ? 'unread' : 'read'
}

export const orderMatchesSearch = (order: Order) => {
  const query = trimStore.get().searchTerm.trim().toLowerCase()
  if (!query) return true
  if (order.order.toLowerCase().includes(query)) return true
  if (order.customer.toLowerCase().includes(query)) return true
  return order.lineItems.some(
    item =>
      item.productId.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
  )
}

/** Bends and order counts per scheduled day, which is what the day strips and day tabs show. */
export const scheduledDays = () => {
  const days: Record<string, { date: string; bends: number; orders: number }> = {}
  const touch = (date: string) => (days[date] ??= { date, bends: 0, orders: 0 })

  for (const order of scheduledOrders()) {
    const own = new Set<string>()
    for (const item of order.lineItems) {
      const day = lineDay(order, item)
      if (!day) continue
      touch(day).bends += lineBends(item)
      own.add(day)
    }
    for (const day of own) touch(day).orders += 1
  }

  return Object.values(days).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Walks forward over work days only — weekends and holidays are skipped, not counted.
 *
 * Bounded, and then checked: a Settings week with every day switched off would otherwise walk forever,
 * so the search gives up after a year and the strip falls back to plain calendar days. A day strip
 * showing the wrong days is a bug; one showing none is a hung tab.
 */
export const nextWorkDays = (startIso: string, count: number) => {
  const out: string[] = []
  const cursor = new Date(`${startIso}T00:00:00Z`)

  for (let guard = 0; out.length < count && guard < 400; guard += 1) {
    const iso = cursor.toISOString().slice(0, 10)
    if (isWorkDay(iso)) out.push(iso)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  if (out.length) return out

  const fallback = new Date(`${startIso}T00:00:00Z`)
  for (let index = 0; index < count; index += 1) {
    out.push(fallback.toISOString().slice(0, 10))
    fallback.setUTCDate(fallback.getUTCDate() + 1)
  }
  return out
}

export const isOverdue = (iso: string | null) => !!iso && iso < TODAY
