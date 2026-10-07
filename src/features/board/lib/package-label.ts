import type { Reprint } from '../api'

/** What a package label carries, named the way the bench reads it. */
export type PackageLabel = {
  /** The barcode: the floor and Shipping scan it. */
  name: string
  orderNumber: string
  location: string | null
  /** lb; `null` when a line does not say what it weighs. */
  weight: number | null
  contents: { product: string; quantity: number }[]
}

/** A reprint's label; the package names its lines by autoid, so `names` says which product each is. */
export const reprintLabel = (
  reprint: Reprint,
  names: ReadonlyMap<string | null, string | null>
): PackageLabel => ({
  name: reprint.name ?? String(reprint.package_id),
  orderNumber: reprint.order_number ?? '—',
  location: reprint.location,
  weight: reprint.weight,
  contents: reprint.contents.map(line => ({
    product: names.get(line.origin_item) ?? line.origin_item,
    quantity: line.quantity
  }))
})
