import {
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { type PropsWithChildren, createContext, useContext, useState } from 'react'

import type { LoginPayload, LoginResponse } from '@/api/auth/schema'
import { authService } from '@/api/auth/service'
import { USERS_QUERY_KEYS } from '@/api/users/query'
import type { User } from '@/api/users/schema'
import { usersService } from '@/api/users/service'
import { AUTH_REDIRECTS } from '@/constants/routes'
import { clearSession, getSession, isLoggedIn, setSession } from '@/helpers/auth'

interface AuthContextValue {
  user: User | null
  isUserLoading: boolean
  isAuth: boolean
  loginMutation: UseMutationResult<LoginResponse, Error, LoginPayload, unknown>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [isAuth, setIsAuth] = useState(() => isLoggedIn())

  const navigate = useNavigate({ from: '/' })
  const router = useRouter()
  const queryClient = useQueryClient()

  const [currentUserId, setCurrentUserId] = useState<number | null>(
    () => getSession()?.user?.id ?? null
  )
  const initialUser = getSession()?.user ?? null

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: USERS_QUERY_KEYS.detail(currentUserId ?? -1),
    queryFn: () => usersService.getById(currentUserId!),
    initialData: currentUserId ? initialUser : undefined,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: isAuth && currentUserId !== null
  })

  const logout = async () => {
    const userIdToRemove = currentUserId

    setIsAuth(false)
    setCurrentUserId(null)
    clearSession()

    if (userIdToRemove) {
      queryClient.removeQueries({ queryKey: USERS_QUERY_KEYS.detail(userIdToRemove) })
    }

    queryClient.clear()

    await navigate({ to: AUTH_REDIRECTS.logout, replace: true })

    router.invalidate()
  }

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: async (response) => {
      setSession(response)
      setIsAuth(true)
      setCurrentUserId(response.user.id)

      queryClient.setQueryData(USERS_QUERY_KEYS.detail(response.user.id), response.user)

      const navigateTo =
        response.user.role === 'driver'
          ? AUTH_REDIRECTS.driverLoginSuccess
          : AUTH_REDIRECTS.loginSuccess

      await navigate({ to: navigateTo, replace: true })

      router.invalidate()
    }
  })

  const value = {
    isAuth,
    user: isAuth ? (user ?? null) : null,
    loginMutation,
    logout,
    isUserLoading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
