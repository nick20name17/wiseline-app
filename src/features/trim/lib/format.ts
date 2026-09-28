/**
 * `Tue, July 14, 2026 · 2:41 PM` — an instant rather than a production day (`@/lib/days`), so it is
 * read in local time: it records when somebody on the floor pressed a button.
 */
export const formatStamp = (iso: string) => {
  const at = new Date(iso)
  const day = at.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  return `${day} · ${at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export const formatCount = (value: number) => numbers.format(value)

/** The length every trim is cut to unless somebody says otherwise; anything else is worth a second look. */
export const STANDARD_LENGTH = 120

/** A product's colour and gauge the way the cards and their labels print them. */
export const productFacts = (product: { color: string | null; gauge: string | null }) =>
  [product.color, product.gauge === null ? null : `${product.gauge} ga`].filter(Boolean).join(' · ')
