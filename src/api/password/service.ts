import type { RequestResetPasswordPayload, ResetConfirmPasswordPayload } from './schema'
import { api } from '@/api'

export const passwordService = {
  requestReset: async (payload: RequestResetPasswordPayload) => {
    const { data } = await api.post('/users/password-reset/', payload)
    return data
  },
  resetConfirm: async (payload: ResetConfirmPasswordPayload) => {
    const { data } = await api.post(
      `/users/password-reset-confirm/${payload.uid64}/${payload.token}/`,
      payload
    )
    return data
  }
}
