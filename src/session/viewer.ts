import * as z from 'zod'

/**
 * Who the app is being viewed as. There is no authentication here and there was none in the
 * prototype either — the sign-in screen picks a role and the app shows what that role would see.
 *
 * The two keys are the prototype's own (`wl_role`, `wl_dept`), so a browser that has used the HTML
 * demo lands in the port as the same person, and the prototype's reload behaviour — which keeps
 * exactly these two and clears every other `wl_` key — keeps working unchanged.
 */
export const RoleSchema = z.enum(['admin', 'manager', 'worker', 'shipping', 'driver'])
export const DepartmentSchema = z.enum(['all', 'trim', 'rollforming', 'accessories', 'shipping'])

export type Role = z.infer<typeof RoleSchema>
export type Department = z.infer<typeof DepartmentSchema>
export type Viewer = { role: Role; department: Department }

const ROLE_KEY = 'wl_role'
const DEPARTMENT_KEY = 'wl_dept'

/** Only these two see a department picker; everyone else works across all of them. */
export const isScoped = (role: Role) => role === 'manager' || role === 'worker'

/** Worker never covers shipping — it is not a production floor. */
export const departmentsFor = (role: Role): Department[] =>
  role === 'worker'
    ? ['all', 'trim', 'rollforming', 'accessories']
    : ['all', 'trim', 'rollforming', 'accessories', 'shipping']

type Listener = (viewer: Viewer | null) => void

const read = (): Viewer | null => {
  const role = RoleSchema.safeParse(localStorage.getItem(ROLE_KEY))
  if (!role.success) return null

  const department = DepartmentSchema.safeParse(localStorage.getItem(DEPARTMENT_KEY))
  return {
    role: role.data,
    department: department.success && isScoped(role.data) ? department.data : 'all'
  }
}

let current = read()
const listeners = new Set<Listener>()
const notify = () => listeners.forEach(listener => listener(current))

window.addEventListener('storage', event => {
  if (event.key !== ROLE_KEY && event.key !== DEPARTMENT_KEY) return
  current = read()
  notify()
})

export const viewerStore = {
  get: () => current,
  set: (viewer: Viewer) => {
    localStorage.setItem(ROLE_KEY, viewer.role)
    localStorage.setItem(DEPARTMENT_KEY, isScoped(viewer.role) ? viewer.department : 'all')
    current = read()
    notify()
  },
  clear: () => {
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(DEPARTMENT_KEY)
    current = null
    notify()
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
}
