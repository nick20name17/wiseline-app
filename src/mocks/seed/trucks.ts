export type SeedTruck = {
  id: number
  name: string
  plate: string | null
  max_weight: number | null
}

export const trucks: SeedTruck[] = [
  { id: 1, name: '104', plate: 'BX 4821', max_weight: 12000 },
  { id: 2, name: '107', plate: 'CK 1930', max_weight: 9000 },
  { id: 3, name: '112', plate: null, max_weight: 15000 }
]
