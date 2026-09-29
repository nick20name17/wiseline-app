import type { Board, BoardView } from './boards'

export const VIEW_LABELS: Record<BoardView, string> = {
  unscheduled: 'Unscheduled',
  scheduled: 'Scheduled',
  production: 'Production',
  packaging: 'Packaging',
  wrapping: 'Wrapping',
  coils: 'Coils',
  calendar: 'Calendar',
  completed: 'Completed'
}

/**
 * Which tabs a role may see on a board: a Manager works it from Unscheduled down, a Worker only the
 * floor's tabs — plus Completed, which the board puts on the Worker's screens too.
 *
 * The role is the user's *inside the department* — see `departmentRole` in `src/lib/departments.ts`.
 */
export const viewsFor = (board: Board, role: string): readonly BoardView[] =>
  role === 'worker' ? board.workerViews : board.managerViews

export const canAccess = (board: Board, view: BoardView, role: string) =>
  viewsFor(board, role).includes(view)

/** Where a role lands when it opens the department, or is pushed off a tab it cannot see. */
export const defaultView = (board: Board, role: string): BoardView =>
  viewsFor(board, role)[0] ?? 'unscheduled'
