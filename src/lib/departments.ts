type Department = { id: number; code: string; position: number | null }

/** The departments in the order the boards show them: by position, then by id. */
export const inBoardOrder = <T extends Department>(departments: T[] | undefined) =>
  [...(departments ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id)

/** The department a URL names by its code; none, or an unknown code, means every department. */
export const departmentByCode = <T extends Department>(
  departments: T[],
  code: string | undefined
) => departments.find(department => department.code === code)

// Global roles that run every department: «Admin can do everything everywhere» p1 (1037,210).
const EVERYWHERE = new Set(['admin', 'super_manager'])

/**
 * The role a user works a department's board in: Manager for the roles that run every department,
 * otherwise whatever their assignment to it says. No assignment is `null` — each department is
 * separate p1 (1059,206), so a user assigned elsewhere has no business on its board.
 */
export const departmentRole = (globalRole: string, assigned: string | null) =>
  EVERYWHERE.has(globalRole) ? 'manager' : assigned
