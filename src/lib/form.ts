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
