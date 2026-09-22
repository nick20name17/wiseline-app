type Department = { id: number; code: string; position: number | null }

/** The departments in the order the boards show them: by position, then by id. */
export const inBoardOrder = <T extends Department>(departments: T[] | undefined) =>
  [...(departments ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id)

/** The department a URL names by its code; none, or an unknown code, means every department. */
export const departmentByCode = <T extends Department>(
  departments: T[],
  code: string | undefined
) => departments.find(department => department.code === code)
