import type { StockCardOption } from '../api'

/**
 * The product a box names only while its text is still that product's ID: typing past a pick is a
 * new search, and the old pick no longer counts.
 */
export const pickedProduct = (text: string, picked: StockCardOption | null) =>
  picked && picked.product_id === text ? picked : null
