export type Sort<K extends string> = { key: K; desc: boolean }

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/** Rows in the order of a column: numbers within text read as numbers, so «259» comes before «301». */
export const sortRows = <T, K extends string>(
  rows: T[],
  sort: Sort<K>,
  valueOf: (row: T, key: K) => string | number | null
) =>
  rows.toSorted((a, b) => {
    const x = valueOf(a, sort.key)
    const y = valueOf(b, sort.key)
    // An empty value goes last whichever way the column runs.
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
    const order =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : collator.compare(String(x), String(y))
    return sort.desc ? -order : order
  })
