const PIECES = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** A count of pieces as the floor writes it: `2`, not `2.0`; `1,250` past a thousand. */
export const formatPieces = (pieces: number | null) =>
  pieces === null ? '—' : PIECES.format(pieces)

/** What a summary row is called: its machine, or what came from none. */
export const machineName = (machine: string | null) => machine ?? 'No machine'

/** Whose rows a figure opens: one machine's — `flowId: null` is what came from none — or `every` one's. */
export type MachineScope = { flowId: number | null; machine: string | null } | 'every'
