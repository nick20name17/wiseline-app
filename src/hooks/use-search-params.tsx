import { useNavigate, useSearch } from '@tanstack/react-router'

export const useSearchParams = () => {
  const searchParams = useSearch({ strict: false })
  type SearchParams = typeof searchParams

  const navigate = useNavigate()

  const setSearchParams = (params: Partial<SearchParams>) =>
    navigate({
      to: '.',
      replace: true,
      search: (prev) => {
        const isOffsetOnlyChange = Object.keys(params).length === 1 && 'offset' in params

        return {
          ...prev,
          ...params,
          ...(isOffsetOnlyChange ? {} : { offset: undefined })
        }
      }
    })

  return [searchParams, setSearchParams] as const
}
