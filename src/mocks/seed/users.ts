export type SeedUser = {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
  process_types: string[]
  prod_types: string[]
}

export const users: SeedUser[] = [
  {
    id: 1,
    email: 'admin@wiseline.test',
    first_name: 'Alex',
    last_name: 'Morgan',
    role: 'admin',
    is_active: true,
    process_types: [],
    prod_types: []
  },
  {
    id: 2,
    email: 'trim.manager@wiseline.test',
    first_name: 'Dana',
    last_name: 'Wells',
    role: 'manager',
    is_active: true,
    process_types: ['production'],
    prod_types: ['Trim']
  },
  {
    id: 3,
    email: 'roll.worker@wiseline.test',
    first_name: 'Sam',
    last_name: 'Ortiz',
    role: 'worker',
    is_active: true,
    process_types: ['production'],
    prod_types: ['Rollforming']
  },
  {
    id: 4,
    email: 'driver@wiseline.test',
    first_name: 'Chris',
    last_name: 'Doyle',
    role: 'driver',
    is_active: true,
    process_types: ['shipping'],
    prod_types: []
  }
]
