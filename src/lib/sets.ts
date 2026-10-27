/** A copy of the set with `value` flipped in or out — a new set, so React sees the change. */
export const toggled = <T>(set: ReadonlySet<T>, value: T) => {
  const next = new Set(set)
  if (!next.delete(value)) next.add(value)
  return next
}
