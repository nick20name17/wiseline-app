import { departments } from '../handlers/departments'

const departmentId = (code: string) => {
  const department = departments.find(row => row.code === code)
  if (!department) throw new Error(`No department ${code}`)
  return department.id
}

const TRIM = departmentId('trim')
const ROLLFORMING = departmentId('rollforming')
const ACCESSORIES = departmentId('accessories')

export type SeedLocationType = {
  id: number
  name: string
  warehouse_id: number
  department_id: number
  description: string | null
  position: number
}

export type SeedLocation = {
  id: number
  code: string
  position: number
  warehouse_id: number
  location_type_id: number
  weight: number
  description: string | null
  multi_order: boolean
  max_orders: number | null
}

// Warehouses: 1 Main Plant, 2 Coil Yard, 3 Shipping Dock (seed/warehouses.ts).
export const locationTypes: SeedLocationType[] = [
  {
    id: 1,
    name: 'Trim Rack',
    warehouse_id: 1,
    department_id: TRIM,
    description: 'Bent trim waiting to ship',
    position: 1
  },
  {
    id: 2,
    name: 'Trim Bin',
    warehouse_id: 1,
    department_id: TRIM,
    description: 'Small parts and flashing',
    position: 2
  },
  {
    id: 3,
    name: 'Panel Rack',
    warehouse_id: 1,
    department_id: ROLLFORMING,
    description: 'Rolled panels, by length',
    position: 3
  },
  {
    id: 4,
    name: 'Accessory Shelf',
    warehouse_id: 1,
    department_id: ACCESSORIES,
    description: 'Fasteners, sealants, closures',
    position: 4
  },
  {
    id: 5,
    name: 'Coil Cradle',
    warehouse_id: 2,
    department_id: ROLLFORMING,
    description: 'Coils staged for the machines',
    position: 5
  },
  {
    id: 6,
    name: 'Staging Lane',
    warehouse_id: 3,
    department_id: TRIM,
    description: null,
    position: 6
  }
]

const location = (
  id: number,
  code: string,
  warehouse_id: number,
  location_type_id: number,
  weight: number,
  extra: Partial<SeedLocation> = {}
): SeedLocation => ({
  id,
  code,
  position: id,
  warehouse_id,
  location_type_id,
  weight,
  description: null,
  multi_order: false,
  max_orders: null,
  ...extra
})

export const locations: SeedLocation[] = [
  location(1, 'T-101', 1, 1, 1500),
  location(2, 'T-102', 1, 1, 1500),
  location(3, 'T-103', 1, 1, 1500, { description: 'Near the press brake' }),
  location(4, 'T-104', 1, 1, 1500, { multi_order: true, max_orders: 3 }),
  location(5, 'B-01', 1, 2, 200, { multi_order: true, max_orders: 6 }),
  location(6, 'B-02', 1, 2, 200, { multi_order: true, max_orders: 6 }),
  location(7, 'B-03', 1, 2, 200),
  location(8, 'P-201', 1, 3, 4000),
  location(9, 'P-202', 1, 3, 4000),
  location(10, 'P-203', 1, 3, 4000, { multi_order: true, max_orders: 2 }),
  location(11, 'A-01', 1, 4, 500, { multi_order: true, max_orders: 10 }),
  location(12, 'A-02', 1, 4, 500, { multi_order: true, max_orders: 10 }),
  location(13, 'C-01', 2, 5, 8000),
  location(14, 'C-02', 2, 5, 8000),
  location(15, 'C-03', 2, 5, 8000, { description: 'Slit line infeed' }),
  location(16, 'S-01', 3, 6, 2500, { multi_order: true, max_orders: 4 }),
  location(17, 'S-02', 3, 6, 2500, { multi_order: true, max_orders: 4 })
]
