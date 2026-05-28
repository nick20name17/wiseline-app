import { useDebouncedCallback } from 'use-debounce'
import * as z from 'zod/mini'

import { Input } from '@/components/ui/input'
import { useSearchParams } from '@/hooks/use-search-params'

export const SearchParamSchema = z.catch(z.optional(z.string()), undefined)
export type SearchParam = z.infer<typeof SearchParamSchema>

const DEBOUNCE_TIMEOUT_MS = 250

export const SearchFilter = (props: React.ComponentProps<'input'>) => {
  const [{ search }, setSearchParams] = useSearchParams()

  const handleSearch = useDebouncedCallback((value: SearchParam) => {
    setSearchParams({ search: value ? value : undefined })
  }, DEBOUNCE_TIMEOUT_MS)

  return (
    <Input
      {...props}
      defaultValue={search}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder='Search...'
    />
  )
}
