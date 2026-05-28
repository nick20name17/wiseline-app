import { queryOptions, useMutation } from '@tanstack/react-query'

import { ORIGIN_ITEMS_QUERY_KEYS } from '../origin-items/query'
import { PACKAGES_QUERY_KEYS } from '../packages/query'
import type { UseUpsertProps } from '../types'

import type { MultiCreatePackagesPayload, PackagesItemsSearchParams } from './schema'
import { packagesItemsService } from './service'

export const PACKAGES_ITEMS_QUERY_KEYS = {
  all: () => ['packages-items'] as const,

  lists: () => [...PACKAGES_ITEMS_QUERY_KEYS.all(), 'list'] as const,
  list: (params: PackagesItemsSearchParams = {}) =>
    [...PACKAGES_ITEMS_QUERY_KEYS.lists(), params] as const
}

export const getPackagesItemsQueryOptions = (params: PackagesItemsSearchParams = {}) =>
  queryOptions({
    queryKey: PACKAGES_ITEMS_QUERY_KEYS.list(params),
    queryFn: () => packagesItemsService.get(params)
  })

export const useMultiCreatePackagesItems = ({ onError, onSuccess }: UseUpsertProps = {}) => {
  const multicreateMutation = useMutation({
    mutationFn: packagesItemsService.multicreate,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: [PACKAGES_QUERY_KEYS.lists(), ORIGIN_ITEMS_QUERY_KEYS.lists()]
    }
  })

  const handleMutliCreatePackagesItems = ({ payload }: { payload: MultiCreatePackagesPayload }) => {
    multicreateMutation.mutate(payload, { onSuccess })
  }

  return {
    handleMutliCreatePackagesItems,
    isError: multicreateMutation.isError,
    isPending: multicreateMutation.isPending
  }
}
