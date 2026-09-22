/**
 * The colours a priority can take: Tailwind's 600 shades. The boards print the name in this colour
 * on a light wash of it, and below 600 amber and green stop reading as text on white.
 */
export const PALETTE = [
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Slate', value: '#475569' }
] as const

/**
 * The palette, plus the priority's own colour when it predates the palette, so opening one to edit
 * does not change its colour unasked.
 */
export const paletteFor = (color: string | null | undefined) =>
  !color || PALETTE.some(entry => entry.value === color.toLowerCase())
    ? PALETTE
    : [...PALETTE, { name: `Current (${color})`, value: color }]
