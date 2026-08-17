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

/** EBMS-valid products: a Product ID is only ever picked from here, never free-typed. */
export const PRODUCT_CATALOG = [
  { pid: 'TDRIP24', desc: 'Drip Edge', color: 'Charcoal', gauge: 24, width: 4, length: 120 },
  { pid: 'TRIDGE26', desc: 'Ridge Cap', color: 'Barn Red', gauge: 26, width: 12, length: 120 },
  { pid: 'TRAKE24', desc: 'Rake Trim', color: 'Bright White', gauge: 24, width: 6, length: 120 },
  {
    pid: 'TSWB262',
    desc: 'Sidewall Flashing',
    color: 'Galvalume',
    gauge: 26,
    width: 10,
    length: 120
  },
  { pid: 'TVAL26', desc: 'Valley', color: 'Hawaiian Blue', gauge: 26, width: 16, length: 120 },
  { pid: 'TGABLE26', desc: 'Gable Trim', color: 'White', gauge: 26, width: 8, length: 120 },
  { pid: 'TDE8262', desc: 'Eave Trim', color: 'Charcoal', gauge: 29, width: 8, length: 120 },
  { pid: 'TWCAP24', desc: 'W-Valley', color: 'Barn Red', gauge: 24, width: 14, length: 120 },
  { pid: 'TJC24', desc: 'J-Channel', color: 'Galvalume', gauge: 24, width: 3, length: 120 },
  { pid: 'TCORNER26', desc: 'Outside Corner', color: 'White', gauge: 26, width: 5, length: 120 },
  { pid: 'TICORNER26', desc: 'Inside Corner', color: 'Charcoal', gauge: 26, width: 5, length: 120 },
  { pid: 'TZFLASH24', desc: 'Z-Flashing', color: 'Bright White', gauge: 24, width: 6, length: 120 },
  { pid: 'THEAD26', desc: 'Head Flashing', color: 'Barn Red', gauge: 26, width: 8, length: 120 },
  { pid: 'TFASCIA24', desc: 'Fascia Trim', color: 'Galvalume', gauge: 24, width: 10, length: 120 },
  { pid: 'TPEAK26', desc: 'Peak Box', color: 'Hawaiian Blue', gauge: 26, width: 12, length: 120 },
  { pid: 'TENDWALL26', desc: 'Endwall Flashing', color: 'White', gauge: 26, width: 9, length: 120 }
]

export const GAUGES = [24, 26, 29]

/** Filter options track the catalog rather than a hand-kept list. */
export const COLOR_NAMES = [...new Set(PRODUCT_CATALOG.map(entry => entry.color))]

export const lookupProduct = (pid: string) =>
  PRODUCT_CATALOG.find(entry => entry.pid === pid) ?? null

let cardSeq = 8
/** Offset from Trim's own 1000 seed so two independent creation flows cannot collide. */
let stockSeq = 1500

export const nextStockOrderNo = () => `S${String(++stockSeq).padStart(4, '0')}`

export const addCard = (card: Omit<StockCard, 'id'>) =>
  stockcardsStore.set(state => ({ stockCards: [...state.stockCards, { ...card, id: ++cardSeq }] }))

export const updateCard = (id: number, card: Omit<StockCard, 'id'>) =>
  stockcardsStore.set(state => ({
    stockCards: state.stockCards.map(existing =>
      existing.id === id ? { ...existing, ...card } : existing
    )
  }))

export const removeCard = (id: number) =>
  stockcardsStore.set(state => ({
    stockCards: state.stockCards.filter(card => card.id !== id),
    selectedIds: state.selectedIds.filter(selected => selected !== id)
  }))
