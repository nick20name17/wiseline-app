import { queryOptions, useMutation } from '@tanstack/react-query'

import type { UseUpsertProps } from '../types'

import type { UpdateUserPayload, UsersSearchParams } from './schema'
import { usersService } from './service'

export const USERS_QUERY_KEYS = {
  all: () => ['users'] as const,

  lists: () => [...USERS_QUERY_KEYS.all(), 'list'] as const,
  list: (params: UsersSearchParams = {}) => [...USERS_QUERY_KEYS.lists(), params] as const,

  details: () => [...USERS_QUERY_KEYS.all(), 'detail'] as const,
  detail: (id: number) => [...USERS_QUERY_KEYS.details(), id] as const
}

export const getAllUsersQueryOptions = () =>
  queryOptions({
    queryKey: USERS_QUERY_KEYS.list(),
    queryFn: () => usersService.getAll()
  })

export const useUpsertUser = ({ onError, onSuccess }: UseUpsertProps) => {
  const createUserMutation = useMutation({
    mutationFn: usersService.create,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: USERS_QUERY_KEYS.lists()
    }
  })

  const updateUserMutation = useMutation({
    mutationFn: usersService.update,
    onError,
    meta: {
      successMessage: 'Successfully updated',
      invalidatesQuery: USERS_QUERY_KEYS.lists()
    }
  })

  const handleUpsertUser = ({ id, payload }: UpdateUserPayload) => {
    if (id) {
      updateUserMutation.mutate({ id, payload }, { onSuccess })
    } else {
      createUserMutation.mutate(payload, { onSuccess })
    }
  }

  return {
    handleUpsertUser,
    isError: createUserMutation.isError || updateUserMutation.isError,
    isPending: createUserMutation.isPending || updateUserMutation.isPending
  }
}
