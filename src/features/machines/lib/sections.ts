import { inBoardOrder } from '@/lib/departments'
import type { Department, Machine } from '../api'

// A machine whose department the API no longer lists still has to be reachable.
const NO_DEPARTMENT = 'none'

// Trim's machines are rated by the bends they make; every other department counts pieces.
const BENDS_DEPARTMENT = 'trim'

export type MachineSection = {
  key: string
  name: string
  code: string
  /** Missing on the section of machines whose department is gone. */
  department?: Department
  unit: 'bends' | 'pieces'
  machines: Machine[]
}

type Input = {
  machines: Machine[] | undefined
  departments: Department[] | undefined
}

/**
 * One section per department, in board order, holding the machines that department runs. An empty
 * one is kept, since it is where a machine for that department would be added.
 */
export const machineSections = ({ machines, departments }: Input): MachineSection[] => {
  const all = machines ?? []

  const sections: MachineSection[] = inBoardOrder(departments).map(department => ({
    key: String(department.id),
    name: department.name,
    code: department.code,
    department,
    unit: department.code === BENDS_DEPARTMENT ? 'bends' : 'pieces',
    machines: all.filter(machine => machine.department === department.id)
  }))

  const orphans = all.filter(
    machine => !departments?.some(department => department.id === machine.department)
  )

  if (orphans.length) {
    sections.push({
      key: NO_DEPARTMENT,
      name: 'No department',
      code: NO_DEPARTMENT,
      unit: 'pieces',
      machines: orphans
    })
  }

  return sections
}
