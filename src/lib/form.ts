// `Field` and `aria-invalid` both want `true` or nothing, never `false`.
export const invalid = (error: unknown) => (error ? true : undefined)

/**
 * A number box for react-hook-form's `setValueAs`: empty is «not set», which the API stores as null
 * rather than 0. The form also runs its default value through this, so it reads a number or null as
 * well as the typed string.
 */
export const asNumber = (value: string | number | null | undefined) => {
  const typed = `${value ?? ''}`.trim()
  return typed === '' ? null : Number(typed)
}

/**
 * Spread on a box that takes a fraction. `type='number'` prints its value with the decimal separator
 * of the browser's UI language — «8,5» on a Ukrainian Chrome — and ignores `lang`; a text box prints
 * what it holds.
 */
export const DECIMAL_INPUT = { type: 'text', inputMode: 'decimal' } as const

/**
 * `asNumber` for a box that takes an amount, which also reads the thousands the shop writes — «18,000»
 * lb on a truck, «1,200.5» lb on a pickup. Only true thousands groups after a non-zero digit: «18,5»
 * and «0,020» are still refused rather than read as 185 and 20.
 */
export const asAmount = (value: string | number | null | undefined) => {
  const typed = `${value ?? ''}`.trim()
  return asNumber(/^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(typed) ? typed.replaceAll(',', '') : typed)
}

/**
 * Spread on a box that takes a whole number. `type='number'` reads «18,000» by the browser's UI
 * language — 18 on a Ukrainian Chrome, nothing at all on an English one — so it is text, as typed.
 */
export const WHOLE_INPUT = { type: 'text', inputMode: 'numeric' } as const
