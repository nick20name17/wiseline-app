import {
  ACCESSORIES_SCHEDULED_LINES_TABLE,
  ACCESSORIES_SCHEDULED_TABLE,
  ACCESSORIES_UNSCHEDULED_TABLE,
  COMPLETED_LINES_TABLE,
  PACKAGE_LINES_TABLE,
  PACKAGED_LINES_TABLE,
  ROLLFORMING_COMPLETED_LINES_TABLE,
  ROLLFORMING_SCHEDULED_LINES_TABLE,
  ROLLFORMING_SCHEDULED_TABLE,
  ROLLFORMING_UNSCHEDULED_TABLE,
  ROLLFORMING_WRAP_LINES_TABLE,
  ROLLFORMING_WRAPPING_TABLE,
  SCHEDULED_LINES_TABLE,
  SCHEDULED_TABLE,
  UNSCHEDULED_TABLE,
  WRAP_LINES_TABLE,
  WRAPPING_TABLE
} from './columns'
import type { ColumnTable } from '@/components/table/column-order'

/** Every tab a department's board can have; each department shows its own subset. */
export const BOARD_VIEWS = [
  'unscheduled',
  'scheduled',
  'production',
  'packaging',
  'wrapping',
  'slit',
  'coils',
  'calendar',
  'completed'
] as const

export type BoardView = (typeof BOARD_VIEWS)[number]

export type BoardCode = 'trim' | 'rollforming' | 'accessories'

/**
 * What tells one department's board from another. The flow is the same — schedule, work, package,
 * complete — but Trim and Rollforming make what they pack, on machines, and Accessories only packs
 * p3 (1076,348).
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
  /**
   * The Manager puts each line on a machine and the day is weighed in bends against the machines'
   * capacity — Trim's. Rollforming's machine comes from the profile in EBMS p2 (542,280).
   */
  assignsMachines: boolean
  /**
   * The length every line is cut to unless somebody says otherwise, so anything else is worth a second
   * look — Trim's 120". A board whose lengths all differ has none.
   */
  standardLength: number | null
  /** Stock orders, stock cards, Bypass Production and the Allocated Stock report — Trim's shelf. */
  stockCards: boolean
  /** Lines are rolled off a coil the Manager may name — Supplier and Coil Number — or slit first p2. */
  coils: boolean
  /** How the department says packing: Trim wraps its trims, Accessories packages p3 (1077,291). */
  /** `ready` is the status a line is packed from once made, `null` for a department that makes none. */
  pack: { station: string; verb: string; done: string; doneLabel: string; ready: string | null }
  /** The order tables as the board lays them out. */
  tables: {
    unscheduled: ColumnTable
    scheduled: ColumnTable
    scheduledLines: ColumnTable
    /** The Wrapping list, line by line, of a board that wraps what it made. */
    wrapping: ColumnTable
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
    assignsMachines: true,
    standardLength: 120,
    stockCards: true,
    coils: false,
    pack: {
      station: 'Wrapping',
      verb: 'Wrap',
      done: 'wrapped',
      doneLabel: 'Wrapped',
      ready: 'Bent'
    },
    tables: {
      unscheduled: UNSCHEDULED_TABLE,
      scheduled: SCHEDULED_TABLE,
      scheduledLines: SCHEDULED_LINES_TABLE,
      wrapping: WRAPPING_TABLE,
      packLines: WRAP_LINES_TABLE,
      completedLines: COMPLETED_LINES_TABLE
    }
  },
  rollforming: {
    code: 'rollforming',
    name: 'Rollforming',
    dateLabel: 'Production Date',
    dayWord: 'production day',
    // The machine tabs and the Queue wait on the backend's Queue p2 (493,630).
    managerViews: ['unscheduled', 'scheduled', 'slit', 'wrapping', 'calendar', 'completed'],
    workerViews: ['slit', 'wrapping', 'completed'],
    makes: true,
    assignsMachines: false,
    standardLength: null,
    stockCards: false,
    coils: true,
    pack: {
      station: 'Wrapping',
      verb: 'Wrap',
      done: 'wrapped',
      doneLabel: 'Wrapped',
      ready: 'Rolled'
    },
    tables: {
      unscheduled: ROLLFORMING_UNSCHEDULED_TABLE,
      scheduled: ROLLFORMING_SCHEDULED_TABLE,
      scheduledLines: ROLLFORMING_SCHEDULED_LINES_TABLE,
      wrapping: ROLLFORMING_WRAPPING_TABLE,
      packLines: ROLLFORMING_WRAP_LINES_TABLE,
      completedLines: ROLLFORMING_COMPLETED_LINES_TABLE
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
    assignsMachines: false,
    standardLength: null,
    stockCards: false,
    coils: false,
    pack: {
      station: 'Packaging',
      verb: 'Package',
      done: 'packaged',
      doneLabel: 'Packaged',
      ready: null
    },
    tables: {
      unscheduled: ACCESSORIES_UNSCHEDULED_TABLE,
      scheduled: ACCESSORIES_SCHEDULED_TABLE,
      scheduledLines: ACCESSORIES_SCHEDULED_LINES_TABLE,
      // Accessories packs from its order list, not this one.
      wrapping: WRAPPING_TABLE,
      packLines: PACKAGE_LINES_TABLE,
      completedLines: PACKAGED_LINES_TABLE
    }
  }
}
