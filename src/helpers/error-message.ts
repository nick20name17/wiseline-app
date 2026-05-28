import { AxiosError, isAxiosError } from 'axios'

interface ValidationError {
  type: string
  loc: (string | number)[]
  msg: string
  input?: unknown
}

interface ErrorResponseData {
  detail?: string | ValidationError[]
}

export type CustomAxiosError = AxiosError<ErrorResponseData>

const ERROR_MESSAGE_FALLBACK = 'An unexpected error occurred'

export const isApiAxiosError = (error: unknown): error is CustomAxiosError => {
  return isAxiosError(error)
}

export const getErrorMessage = (error: unknown): string => {
  if (isApiAxiosError(error)) {
    const responseData = error.response?.data

    if (Array.isArray(responseData?.detail)) {
      return responseData.detail
        .map((err) => {
          const field = err.loc?.slice(1).join('.') || 'unknown'
          return `${field}: ${err.msg}`
        })
        .join(', ')
    }

    return responseData?.detail || error.message || ERROR_MESSAGE_FALLBACK
  }

  if (error instanceof Error) {
    return error.message
  }

  return ERROR_MESSAGE_FALLBACK
}
