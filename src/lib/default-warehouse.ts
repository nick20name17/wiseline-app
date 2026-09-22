type Positioned = { id: number; position: number }

/**
 * The warehouse that opens first: lowest position, and the first of those the API listed on a tie.
 * There is no `is_default` column, so this is what the spec's default warehouse is.
 */
export const defaultWarehouseId = (warehouses: Positioned[]) =>
  warehouses.reduce<Positioned | null>(
    (first, warehouse) => (first && first.position <= warehouse.position ? first : warehouse),
    null
  )?.id
