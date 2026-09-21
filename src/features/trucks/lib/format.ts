const weightFormatter = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'pound',
  unitDisplay: 'short',
  maximumFractionDigits: 2
})

export const formatWeight = (pounds: number | null) =>
  pounds === null ? '—' : weightFormatter.format(pounds).replace(/\blb\b/, 'lbs')
