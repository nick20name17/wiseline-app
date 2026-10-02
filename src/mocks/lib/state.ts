import type { Line, Note, Order, OrderNote, Pkg } from './types'

/** Module-level so a mutation made through one handler shows up in every list that reads it. */
export const orders: Order[] = []
export const lines: Line[] = []
export const packages: Pkg[] = []
export const lineNotes: Note[] = []
export const orderNotes = new Map<string, OrderNote>()
/** Names of deleted packages: a scan of an old label has to say so, and a number is never reused. */
export const deletedPackages = new Set<string>()

export const counters = {
  salesOrder: 5000,
  departmentState: 7000,
  item: 9000,
  package: 600,
  note: 300,
  stockOrder: 1044
}

export const nextCounter = (key: keyof typeof counters) => {
  counters[key] += 1
  return counters[key]
}
