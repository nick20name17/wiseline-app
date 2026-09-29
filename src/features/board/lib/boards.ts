/** Every tab a department's board can have; each department shows its own subset. */
export const BOARD_VIEWS = [
  'unscheduled',
  'scheduled',
  'production',
  'packaging',
  'coils',
  'calendar',
  'completed'
] as const

export type BoardView = (typeof BOARD_VIEWS)[number]

export type BoardCode = 'trim' | 'accessories'

/**
 * What tells one department's board from another. The flow is the same — schedule, work, package,
 * complete — but Trim makes what it packs, on machines, and Accessories only packs p3 (1076,348).
 */
export type Board = {
  code: BoardCode
  /** The department's name, which is also the EBMS category `ebms/orders/` filters on. */
  name: string
  /** Trim schedules a Production Date; Accessories a Prep Date p3 (1111,291). */
  dateLabel: 'Production Date' | 'Prep Date'
  /** The same day in running text. */
  dayWord: 'production day' | 'prep day'
  managerViews: readonly BoardView[]
  /** «See everything from here down» p1 (657,256), p3 (1242,183). */
  workerViews: readonly BoardView[]
  /** Lines are made on machines, reviewed and released before the floor sees them. */
  makes: boolean
  /** How the department says packing: Trim wraps its trims, Accessories packages p3 (1077,291). */
  pack: { station: string; verb: string; done: string; doneLabel: string }
}

export const BOARDS: Record<BoardCode, Board> = {
  trim: {
    code: 'trim',
    name: 'Trim',
    dateLabel: 'Production Date',
    dayWord: 'production day',
    managerViews: ['unscheduled', 'scheduled', 'production', 'coils', 'calendar', 'completed'],
    workerViews: ['production', 'coils', 'completed'],
    makes: true,
    pack: { station: 'Wrapping', verb: 'wrap', done: 'wrapped', doneLabel: 'Wrapped' }
  },
  accessories: {
    code: 'accessories',
    name: 'Accessories',
    dateLabel: 'Prep Date',
    dayWord: 'prep day',
    managerViews: ['unscheduled', 'scheduled', 'packaging', 'calendar', 'completed'],
    workerViews: ['packaging', 'completed'],
    makes: false,
    pack: { station: 'Packaging', verb: 'package', done: 'packaged', doneLabel: 'Packaged' }
  }
}
