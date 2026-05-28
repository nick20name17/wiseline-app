type GroupValue<T, K> = { key: K; data: T[] }

export const groupBy = <T, K extends Record<string, unknown>>(
  items: T[],
  keyFn: (item: T) => K,
  keySerializer?: (key: K) => string
): GroupValue<T, K>[] => {
  const serialize = keySerializer || ((k) => JSON.stringify(k))
  const innerMap = new Map<string, { key: K; value: T[] }>()

  items.forEach((item) => {
    const key = keyFn(item)
    const keyStr = serialize(key)

    if (!innerMap.has(keyStr)) {
      innerMap.set(keyStr, { key, value: [] })
    }

    innerMap.get(keyStr)!.value.push(item)
  })

  return Array.from(innerMap.values()).map(({ key, value }) => ({
    key,
    data: value
  }))
}
