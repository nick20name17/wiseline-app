import {
  ACCESSORIES_SCHEDULED_LINES_TABLE,
  ACCESSORIES_SCHEDULED_TABLE,
  ACCESSORIES_UNSCHEDULED_TABLE,
  COMPLETED_LINES_TABLE,
  PACKAGE_LINES_TABLE,
  PACKAGED_LINES_TABLE,
  SCHEDULED_LINES_TABLE,
  SCHEDULED_TABLE,
  UNSCHEDULED_TABLE,
  WRAP_LINES_TABLE
} from './columns'
import type { ColumnTable } from '@/components/table/column-order'

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
  /** The order tables as the board lays them out. */
  tables: {
    unscheduled: ColumnTable
    scheduled: ColumnTable
    scheduledLines: ColumnTable
    packLines: ColumnTable
    completedLines: ColumnTable
  }
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
    pack: { station: 'Wrapping', verb: 'Wrap', done: 'wrapped', doneLabel: 'Wrapped' },
    tables: {
      unscheduled: UNSCHEDULED_TABLE,
      scheduled: SCHEDULED_TABLE,
      scheduledLines: SCHEDULED_LINES_TABLE,
      packLines: WRAP_LINES_TABLE,
      completedLines: COMPLETED_LINES_TABLE
    }
  },
  accessories: {
    code: 'accessories',
    name: 'Accessories',
    dateLabel: 'Prep Date',
    dayWord: 'prep day',
    managerViews: ['unscheduled', 'scheduled', 'packaging', 'calendar', 'completed'],
    workerViews: ['packaging', 'completed'],
    makes: false,
    pack: { station: 'Packaging', verb: 'Package', done: 'packaged', doneLabel: 'Packaged' },
    tables: {
      unscheduled: ACCESSORIES_UNSCHEDULED_TABLE,
      scheduled: ACCESSORIES_SCHEDULED_TABLE,
      scheduledLines: ACCESSORIES_SCHEDULED_LINES_TABLE,
      packLines: PACKAGE_LINES_TABLE,
      completedLines: PACKAGED_LINES_TABLE
    }
  }
}
