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
 * Production down — plus Coils, which both get.
 *
 * The board scopes this to the user's role *inside the department*; this app still carries one global
 * role per user, so the two managerial roles and admin get the Manager's view and a worker gets the
 * Worker's. `GET /departments/users/assignments/` is where the per-department role will come from.
 */
const MANAGER_VIEWS = TRIM_VIEWS
const WORKER_VIEWS: readonly TrimView[] = ['production', 'coils']

export const viewsFor = (role: string): readonly TrimView[] =>
  role === 'worker' ? WORKER_VIEWS : MANAGER_VIEWS

export const canAccess = (view: TrimView, role: string) => viewsFor(role).includes(view)

/** Where a role lands when it opens the department, or is pushed off a tab it cannot see. */
export const defaultView = (role: string): TrimView => viewsFor(role)[0] ?? 'unscheduled'
