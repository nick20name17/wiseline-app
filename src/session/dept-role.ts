import { useEffect } from 'react'

import { viewerStore, type Role } from './viewer'

export type DeptRole = 'worker' | 'manager'

/**
 * The prototype's `wlOnRole`: a department board knows two roles, and everyone who is not on that floor
 * is a manager to it — the Driver included, since all he does on a production board is read it.
 */
export const deptRole = (role: Role | undefined): DeptRole =>
  role === 'worker' || role === 'driver' ? 'worker' : 'manager'

/**
 * Keeps a department store's own role following the sidebar's «Viewing as».
 *
 * Without it a board seeded `manager` stays a manager whoever is looking, and every worker-only rule on
 * it — read-only notes, no priority, the narrowed tab strip — is unreachable. The prototype applies the
 * role on load as well as on a change, so a Rollforming station picked in the actor bar resets here too.
 */
export const useDeptRole = (apply: (role: DeptRole) => void) => {
  useEffect(() => {
    apply(deptRole(viewerStore.get()?.role))
    return viewerStore.subscribe(viewer => apply(deptRole(viewer?.role)))
  }, [apply])
}
