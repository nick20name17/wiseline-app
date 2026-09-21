const weightFormatter = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'pound',
  unitDisplay: 'short',
  maximumFractionDigits: 2
})

export const formatWeight = (pounds: number | null) =>
  pounds === null ? '—' : weightFormatter.format(pounds).replace(/\blb\b/, 'lbs')

export const formatVolume = (cubicInches: number | null) =>
  cubicInches === null ? '—' : `${cubicInches.toLocaleString('en-US')} cu in`

/** Feet and inches first, because that is how the floor measures, with the raw inches after it. */
export const formatLength = (inches: number | null) => {
  if (inches === null) return '—'

  const feet = Math.floor(inches / 12)
  const remainder = inches % 12
  const rounded =
    Math.abs(remainder - Math.round(remainder)) < 0.01 ? remainder.toFixed(0) : remainder.toFixed(1)

  return `${feet}’ ${rounded}” (${inches.toFixed(1)}”)`
}
