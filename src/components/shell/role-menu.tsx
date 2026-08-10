import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { ROLE_LABELS } from '@/session/nav-visibility'
import { departmentsFor, isScoped, viewerStore, type Department, type Role } from '@/session/viewer'

const ROLES: Role[] = ['admin', 'manager', 'worker', 'shipping', 'driver']

const DEPARTMENT_LABELS: Record<Department, string> = {
  all: 'All departments',
  trim: 'Trim',
  rollforming: 'Rollforming',
  accessories: 'Accessories',
  shipping: 'Shipping'
}

/** Where a department scoped viewer belongs, and what «All departments» falls back to per role. */
export const DEPARTMENT_PAGE: Record<Exclude<Department, 'all'>, string> = {
  trim: '/trim',
  rollforming: '/rollforming',
  accessories: '/accessories',
  shipping: '/shipping'
}

const LANDING: Record<Role, string> = {
  admin: '/dashboard',
  manager: '/dashboard',
  worker: '/trim',
  shipping: '/shipping',
  driver: '/driver'
}

/** A Worker lands on the floor rather than on the board, which for Trim means Production. */
const LANDING_SEARCH: Record<string, Record<string, string> | undefined> = {
  worker: { view: 'production' }
}

const landingFor = (role: Role, department: Department) =>
  isScoped(role) && department !== 'all' ? DEPARTMENT_PAGE[department] : LANDING[role]

type Anchor = { left: number; bottom: number; minWidth: number }

/**
 * The «Viewing as» menu: role above, department below when the role has one, and the reset that puts
 * the demo back where it started.
 *
 * It is the only way into the worker screens — every board reads its own role from this — so the port
 * cannot leave the button inert the way it did. Position is computed from the button rather than set in
 * CSS because the menu is `position: fixed` and opens upward out of the sidebar, and it is rendered
 * inside `#root` rather than appended to `<body>`: the page's stylesheet is scoped to `[data-page]`, and
 * a menu outside it would come up unstyled.
 */
export const RoleMenu = ({ anchor, onClose }: { anchor: Anchor; onClose: () => void }) => {
  const navigate = useNavigate()
  const viewer = viewerStore.get()
  const role = viewer?.role ?? 'admin'
  const department = viewer?.department ?? 'all'

  // on the next tick, or the click that opened the menu closes it again
  useEffect(() => {
    const timer = setTimeout(() => document.addEventListener('click', onClose, { once: true }))
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', onClose)
    }
  }, [onClose])

  const go = (to: string, search?: Record<string, string>) => {
    onClose()
    void navigate(search ? { to, search } : { to })
  }

  const pickRole = (next: Role) => {
    // Shipping is not a floor a Worker can be scoped to, so that pairing resolves rather than persists
    const kept =
      next === 'worker' && department === 'shipping' ? 'all' : (department satisfies Department)
    viewerStore.set({ role: next, department: kept })
    go(landingFor(next, kept), isScoped(next) && kept !== 'all' ? undefined : LANDING_SEARCH[next])
  }

  const pickDepartment = (next: Department) => {
    viewerStore.set({ role, department: next })
    if (next === 'all') {
      onClose()
      return
    }
    go(DEPARTMENT_PAGE[next])
  }

  return (
    <div
      className='wl-role-menu'
      id='wl-role-menu'
      data-comment='role-menu'
      style={{
        left: `${anchor.left}px`,
        bottom: `${anchor.bottom}px`,
        minWidth: `${anchor.minWidth}px`
      }}
    >
      <div className='wl-role-head' data-comment='role-menu-head-role'>
        Role
      </div>
      {ROLES.map(entry => (
        <button
          className={`wl-role-opt${entry === role ? ' active' : ''}`}
          data-comment={`role-opt-${entry}`}
          onClick={event => {
            event.stopPropagation()
            pickRole(entry)
          }}
          key={entry}
        >
          {ROLE_LABELS[entry]}
        </button>
      ))}

      {isScoped(role) ? (
        <>
          <div className='wl-role-head' data-comment='role-menu-head-dept'>
            Department
          </div>
          {departmentsFor(role).map(entry => (
            <button
              className={`wl-role-opt${entry === department ? ' active' : ''}`}
              data-comment={`dept-opt-${entry}`}
              onClick={event => {
                event.stopPropagation()
                pickDepartment(entry)
              }}
              key={entry}
            >
              {DEPARTMENT_LABELS[entry]}
            </button>
          ))}
        </>
      ) : null}

      <div className='wl-role-divider' data-comment='role-menu-divider' />
      <button
        className='wl-role-opt wl-role-danger'
        data-comment='role-opt-reset'
        onClick={event => {
          event.stopPropagation()
          if (
            !window.confirm(
              'Reset all data? This clears coils, shipping progress, location timers, and your role/department selection back to defaults.'
            )
          )
            return

          for (const key of Object.keys(localStorage))
            if (key.startsWith('wl_')) localStorage.removeItem(key)
          // a full load, not a route change: every store seeded itself from what was just cleared
          location.href = '/sign-in'
        }}
      >
        Reset data
      </button>
    </div>
  )
}

/** The button's own state, kept here so every page's sidebar gets it by rendering one element. */
export const useRoleMenu = () => {
  const [anchor, setAnchor] = useState<Anchor | null>(null)

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (anchor) return setAnchor(null)

    const box = event.currentTarget.getBoundingClientRect()
    setAnchor({
      // clamped, so a narrow window cannot push the menu off the right edge
      left: Math.max(8, Math.min(box.left, window.innerWidth - Math.max(box.width, 240) - 10)),
      bottom: window.innerHeight - box.top + 6,
      minWidth: Math.max(box.width, 240)
    })
  }

  const close = () => setAnchor(null)

  return {
    toggleRoleMenu: toggle,
    roleMenuNode: anchor ? <RoleMenu anchor={anchor} onClose={close} /> : null
  }
}
