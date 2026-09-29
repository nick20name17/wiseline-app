import { createContext, useContext } from 'react'
import type { Board } from './boards'

/** The department whose board is on screen; every tab reads its vocabulary and category from it. */
export const BoardContext = createContext<Board | null>(null)

export const useBoard = () => {
  const board = useContext(BoardContext)
  if (!board) throw new Error('useBoard outside a board')
  return board
}
