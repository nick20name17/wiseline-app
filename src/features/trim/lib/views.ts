export const TRIM_VIEWS = [
  'unscheduled',
  'scheduled',
  'production',
  'coils',
  'calendar',
  'completed'
] as const

export type TrimView = (typeof TRIM_VIEWS)[number]

export const VIEW_LABELS: Record<TrimView, string> = {
  unscheduled: 'Unscheduled',
  scheduled: 'Scheduled',
  production: 'Production',
  coils: 'Coils',
  calendar: 'Calendar',
  completed: 'Completed'
}

/**
 * Which tabs a role may see: a Manager works the board from Unscheduled down, a Worker only from
 * Production down — plus Coils, which both get, and Completed, which the board puts on the Worker's
 * Wrapping screens too.
 *
 * The role is the user's *inside the department* — see `departmentRole` in `src/lib/departments.ts`.
 */
const MANAGER_VIEWS = TRIM_VIEWS
const WORKER_VIEWS: readonly TrimView[] = ['production', 'coils', 'completed']

export const viewsFor = (role: string): readonly TrimView[] =>
  role === 'worker' ? WORKER_VIEWS : MANAGER_VIEWS

export const canAccess = (view: TrimView, role: string) => viewsFor(role).includes(view)

/** Where a role lands when it opens the department, or is pushed off a tab it cannot see. */
export const defaultView = (role: string): TrimView => viewsFor(role)[0] ?? 'unscheduled'
