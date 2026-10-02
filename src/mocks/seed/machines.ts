import { departments } from '../handlers/departments'

export type SeedMachine = {
  id: number
  name: string
  description: string | null
  position: number
  category: string
  department: number
  kind: string
  ebms_profile_names: string[]
  daily_max_pieces: number | null
  daily_max_bends: number | null
}

const departmentId = (code: string) => {
  const department = departments.find(row => row.code === code)
  if (!department) throw new Error(`No department ${code}`)
  return department.id
}

const trim = departmentId('trim')
const rollforming = departmentId('rollforming')
const accessories = departmentId('accessories')

export const categories = [
  { id: 'TRIM', name: 'Trim' },
  { id: 'PANEL', name: 'Panels' },
  { id: 'ACC', name: 'Accessories' },
  { id: 'COIL', name: 'Coil' }
]

const machine = (
  id: number,
  name: string,
  department: number,
  kind: string,
  category: string,
  extra: Partial<SeedMachine> = {}
): SeedMachine => ({
  id,
  name,
  description: null,
  position: id,
  category,
  department,
  kind,
  ebms_profile_names: [],
  daily_max_pieces: null,
  daily_max_bends: null,
  ...extra
})

export const machines: SeedMachine[] = [
  machine(1, 'Shear', trim, 'cutting', 'TRIM', { daily_max_pieces: 800 }),
  machine(2, 'Press Brake 1', trim, 'bending', 'TRIM', {
    description: '14 ft, 150 ton',
    daily_max_bends: 2400
  }),
  machine(3, 'Press Brake 2', trim, 'bending', 'TRIM', {
    daily_max_bends: 1800
  }),
  machine(4, 'Trim Packaging', trim, 'packaging', 'TRIM'),
  machine(5, 'Roll Former 1', rollforming, 'rollforming', 'PANEL', {
    description: 'Tuff Rib and Diamond Rib',
    ebms_profile_names: ['Tuff Rib', 'Diamond Rib'],
    daily_max_pieces: 400
  }),
  machine(6, 'Roll Former 2', rollforming, 'rollforming', 'PANEL', {
    ebms_profile_names: ['Standing Seam 1.5', 'Corrugated 7/8'],
    daily_max_pieces: 350
  }),
  machine(7, 'Slit Line', rollforming, 'slit_line', 'COIL'),
  machine(8, 'Wrapping', rollforming, 'wrapping', 'PANEL'),
  machine(9, 'Accessories Packaging', accessories, 'packaging', 'ACC')
]

// Vendors EBMS buys coils from; `name` is null for one APVENDOR does not know.
export const coilSuppliers: { supplier: string; name: string | null }[] = [
  { supplier: 'V1001', name: 'Allied Coil Supply' },
  { supplier: 'V1002', name: 'Apex Steel Distributors' },
  { supplier: 'V1003', name: 'Buckeye Metals' },
  { supplier: 'V1004', name: 'Cardinal Coating Co.' },
  { supplier: 'V1005', name: 'Great Lakes Galvanizing' },
  { supplier: 'V1006', name: 'Heartland Steel Service' },
  { supplier: 'V1007', name: 'Midwest Prepaint' },
  { supplier: 'V1008', name: 'Nucor Coil Sales' },
  { supplier: 'V1009', name: 'Ohio Valley Metals' },
  { supplier: 'V1010', name: 'Precision Slitting Inc.' },
  { supplier: 'V1011', name: 'Sheffield Metals' },
  { supplier: 'V1012', name: null }
]
