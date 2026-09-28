/**
 * Coil colour texts that may be the trim colour `name`: the ones that name it as a whole word, and are
 * not linked to a colour yet. A suggestion only — «Charcoal Lynx» names Charcoal and most likely is not
 * it, so the Manager confirms each.
 */
export const suggestedTexts = (name: string, options: { text: string; color: string | null }[]) => {
  const words = name.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const pattern = new RegExp(
    `(^|[^a-z])${words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')}($|[^a-z])`,
    'i'
  )
  return options
    .filter(option => option.color === null && pattern.test(option.text))
    .map(o => o.text)
}

/** Whether anything is kept for the colour yet — the page shows the ones still to be linked first. */
export const isLinked = (color: { coil_colors: string[]; coil_products: string[] }) =>
  color.coil_colors.length > 0 || color.coil_products.length > 0
