import { departments } from '../handlers/departments'

export type SeedPriority = {
  id: number
  name: string
  color: string
  position: number
  department: number | null
}

const departmentId = (code: string) => {
  const department = departments.find(row => row.code === code)
  if (!department) throw new Error(`No department ${code}`)
  return department.id
}

const trim = departmentId('trim')
const rollforming = departmentId('rollforming')

// Position is the hierarchy within a department (and within the department-less group).
export const priorities: SeedPriority[] = [
  { id: 1, name: 'Rush', color: '#dc2626', position: 1, department: null },
  { id: 2, name: 'By 10:00', color: '#ea580c', position: 2, department: trim },
  { id: 3, name: 'By 12:00', color: '#d97706', position: 3, department: trim },
  { id: 4, name: 'By 15:00', color: '#ca8a04', position: 4, department: trim },
  {
    id: 5,
    name: 'End of day',
    color: '#16a34a',
    position: 5,
    department: trim
  },
  { id: 6, name: 'Next day', color: '#2563eb', position: 6, department: null },
  {
    id: 7,
    name: 'Contractor pickup',
    color: '#7c3aed',
    position: 1,
    department: rollforming
  },
  {
    id: 8,
    name: 'Job site delivery',
    color: '#0891b2',
    position: 2,
    department: rollforming
  },
  {
    id: 9,
    name: 'Stock',
    color: '#64748b',
    position: 3,
    department: rollforming
  }
]
