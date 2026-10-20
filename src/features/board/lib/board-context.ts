import { createContext, useContext } from 'react'
import type { Board } from './boards'

/** The department whose board is on screen; every tab reads its vocabulary and category from it. */
export const BoardContext = createContext<Board | null>(null)

export const useBoard = () => {
  const board = useContext(BoardContext)
  if (!board) throw new Error('useBoard outside a board')
  return board
}

/**
 * View only: a salesperson reads every board and changes nothing. The server refuses their writes
 * anyway; the board keeps the controls that write shut so nobody types into one for nothing.
 */
export const ViewOnlyContext = createContext(false)

export const useViewOnly = () => useContext(ViewOnlyContext)

/**
 * Whether Scheduled's rows carry a select column: only a department that makes what it packs reviews
 * and releases it p3 (1103,281), and View only changes nothing. The header and the rows read it alike.
 */
export const useScheduledSelectable = () => {
  const viewOnly = useViewOnly()
  return useBoard().makes && !viewOnly
}

/**
 * The trailing end of the machine tabs' row, where a tab may put its own toolbar rather than spend a
 * row of its own on it. `null` where the board shows no machine tabs.
 */
export const StripSlotContext = createContext<HTMLElement | null>(null)

export const useStripSlot = () => useContext(StripSlotContext)
