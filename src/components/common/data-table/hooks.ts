'use no memo'

import type { SortingState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'

import { useSearchParams } from '@/hooks/use-search-params'

export const useTableSorting = () => {
  const [{ sort }, setParams] = useSearchParams()

  const initialSorting = useMemo<SortingState>(() => {
    if (!sort) return []

    const isDesc = sort.startsWith('-')
    const id = isDesc ? sort.slice(1) : sort

    if (!id) return []

    return [
      {
        id,
        desc: isDesc
      }
    ]
  }, [sort])

  const [sorting, setSorting] = useState<SortingState>(initialSorting)

  const onSortingChange = (
    updaterOrValue: SortingState | ((old: SortingState) => SortingState)
  ) => {
    setSorting((prev) => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue

      if (!next.length) {
        setParams({ sort: undefined })
        return []
      }

      const { id, desc } = next[0]

      setParams({
        sort: desc ? `-${id}` : id
      })

      return next
    })
  }

  return {
    sorting,
    onSortingChange,
    initialSorting
  }
}
