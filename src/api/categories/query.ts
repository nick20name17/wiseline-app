import { queryOptions } from '@tanstack/react-query'

import { categoriesService } from './service'

export const CATEGORIES_QUERY_KEYS = {
  all: () => ['categories'] as const,

  lists: () => [...CATEGORIES_QUERY_KEYS.all(), 'list'] as const,
  list: () => [...CATEGORIES_QUERY_KEYS.lists()] as const
}

export const getAllCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: CATEGORIES_QUERY_KEYS.list(),
    queryFn: () => categoriesService.getAll(),
    select: (data) => [...data].reverse()
  })
