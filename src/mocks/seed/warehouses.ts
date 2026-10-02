export type SeedWarehouse = {
  id: number
  name: string
  address: string
  description: string | null
  is_default: boolean
}

export const warehouses: SeedWarehouse[] = [
  {
    id: 1,
    name: 'Main Plant',
    address: '4100 Industrial Pkwy, Columbus, OH',
    description: 'Production floor and finished-goods racks',
    is_default: true
  },
  {
    id: 2,
    name: 'Coil Yard',
    address: '4100 Industrial Pkwy, Columbus, OH',
    description: 'Covered coil storage next to the slit line',
    is_default: false
  },
  {
    id: 3,
    name: 'Shipping Dock',
    address: '4112 Industrial Pkwy, Columbus, OH',
    description: null,
    is_default: false
  }
]
