import { createStore } from '@/store/create-store'

import seed from './seed.json'

export type StockCard = {
  id: number
  pid: string
  stockMin: number
  orderQty: number
  image: string | null
  desc: string
  color: string
  gauge: number
  width: number
  length: number
}

export type StockcardsState = {
  stockCards: StockCard[]
  searchTerm: string
  /** all | color:<name> | gauge:<n> */
  filterValue: string
  selectedIds: number[]
}

export const stockcardsStore = createStore<StockcardsState>(seed as unknown as StockcardsState)

export const visibleCards = (state: StockcardsState) => {
  const term = state.searchTerm.trim().toLowerCase()

  return state.stockCards.filter(card => {
    if (term && !(card.pid.toLowerCase().includes(term) || card.desc.toLowerCase().includes(term)))
      return false

    if (state.filterValue !== 'all') {
      const [kind, value] = state.filterValue.split(':')
      if (kind === 'color' && card.color !== value) return false
      if (kind === 'gauge' && String(card.gauge) !== value) return false
    }

    return true
  })
}

export const filterLabel = (value: string) => {
  if (value === 'all') return 'All colors & gauges'

  const [kind, name] = value.split(':')
  return kind === 'color' ? name : `${name}ga`
}

export const setSearch = (searchTerm: string) => stockcardsStore.set({ searchTerm })
export const setFilter = (filterValue: string) => stockcardsStore.set({ filterValue })
export const clearFilters = () => stockcardsStore.set({ searchTerm: '', filterValue: 'all' })

export const toggleCardSelect = (id: number) =>
  stockcardsStore.set(state => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter(other => other !== id)
      : [...state.selectedIds, id]
  }))

/** The QR encodes the product, not the card: a reprinted card scans to the same stock order. */
export const qrText = (card: StockCard) => `WL-STOCK-${card.pid}`
