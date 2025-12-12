import axios from 'axios'

type BackendErrorPayload = {
  detail?: string
  message?: string
  error?: string
}

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback
  }

  const responseData = error.response?.data as BackendErrorPayload | undefined
  const detail = responseData?.detail ?? responseData?.message ?? responseData?.error
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail
  }

  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message
  }

  return fallback
}

