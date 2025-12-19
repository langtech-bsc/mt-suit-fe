import axios from 'axios'

type BackendErrorPayload = {
  detail?: string
  message?: string
  error?: string
}

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback || 'Error desconocido.'
  }

  const responseData = error.response?.data as BackendErrorPayload | string | undefined
  if (typeof responseData === 'string' && responseData.trim().length > 0) {
    try {
      const parsed = JSON.parse(responseData) as BackendErrorPayload
      const parsedDetail = parsed?.detail ?? parsed?.message ?? parsed?.error
      if (typeof parsedDetail === 'string' && parsedDetail.trim().length > 0) {
        return parsedDetail
      }
    } catch {
      // ignore parse failures and use string as-is
    }
    return responseData
  }

  const responseObject: BackendErrorPayload | undefined =
    responseData && typeof responseData === 'object' ? responseData : undefined

  const detail = responseObject?.detail ?? responseObject?.message ?? responseObject?.error
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail
  }

  return fallback || 'Error desconocido.'
}
