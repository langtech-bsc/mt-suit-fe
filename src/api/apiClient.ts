import axios from 'axios'
import { AuthStorage } from '../features/auth/utils/authStorage'

const redirectToLogin = (reason: string) => {
  if (typeof globalThis === 'undefined') {
    return
  }
  const redirectTarget = encodeURIComponent(globalThis.location.pathname + globalThis.location.search)
  globalThis.location.href = `/login?reason=${reason}&redirect=${redirectTarget}`
}

const resolveSessionDurationMinutes = () => {
  const fallback = 60
  const raw = Number(import.meta.env.VITE_AUTH_SESSION_TTL_MINUTES ?? fallback)
  if (Number.isFinite(raw) && raw > 0) {
    return raw
  }
  return fallback
}

const computeExpiration = () => {
  const expiresAt = new Date(Date.now() + resolveSessionDurationMinutes() * 60 * 1000)
  return expiresAt.toISOString()
}

type RefreshApiResponse = {
  access_token: string
  token_type: string
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    "Accept": 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

let refreshPromise: Promise<string> | null = null

const refreshAccessToken = async () => {
  const session = AuthStorage.getSession()
  if (!session?.token) {
    throw new Error('No hay sesión activa.')
  }

  const scheme = session.tokenType ?? 'Bearer'

  refreshPromise ??= refreshClient
      .post<RefreshApiResponse>('/auth/refresh', undefined, {
        headers: {
          Authorization: `${scheme} ${session.token}`,
        },
      })
      .then((response) => {
        const data = response.data
        if (!data?.access_token) {
          throw new Error('Respuesta de refresh inválida.')
        }

        const updatedSession = {
          ...session,
          token: data.access_token,
          tokenType: data.token_type ?? session.tokenType ?? 'bearer',
          issuedAt: new Date().toISOString(),
          expiresAt: computeExpiration(),
        }

        AuthStorage.persistSession(updatedSession)
        return updatedSession.token
      })
      .finally(() => {
        refreshPromise = null
      });

  return refreshPromise
}

apiClient.interceptors.request.use(
  (config) => {
    const session = AuthStorage.getSession()

    if (session?.token) {
      const scheme = session.tokenType ?? 'Bearer'
      config.headers.Authorization = `${scheme} ${session.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(new Error(error.message))
  }
)

apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(new Error(error.message))
    }

    const status = error.response?.status
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined // NOSONAR
    const requestUrl = originalRequest?.url ?? ''

    if (status === 401 && originalRequest && !originalRequest._retry) {
      if (requestUrl.includes('/auth/refresh') || requestUrl.includes('/auth/login')) {
        AuthStorage.clearSession()
        redirectToLogin('expired')
        return Promise.reject(new Error(error.message))
      }

      try {
        originalRequest._retry = true
        const nextToken = await refreshAccessToken()
        const scheme = AuthStorage.getSession()?.tokenType ?? 'Bearer'
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `${scheme} ${nextToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        console.log(refreshError);
        
        AuthStorage.clearSession()
        redirectToLogin('expired')
        return Promise.reject(new Error("No se pudo renovar la sesión. Por favor, inicie sesión nuevamente."))
      }
    }

    if (status === 403) {
      AuthStorage.clearSession()
      redirectToLogin('expired')
      return Promise.reject(new Error(error.message))
    }

    if (status === 500 || status === 502 || status === 503) {
      console.error('Error interno del servidor.')
    }

    return Promise.reject(new Error(error.message))
  }
)

export default apiClient;
