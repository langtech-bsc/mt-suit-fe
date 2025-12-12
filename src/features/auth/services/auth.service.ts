import apiClient from '../../../api/apiClient'
import { getApiErrorMessage } from '../../../api/apiError'
import type { AuthCredentials, AuthResponse, AuthUser } from '../types'

interface LoginApiResponse {
  access_token: string
  token_type: string
}

interface CurrentUserApiResponse {
  username: string
  email: string
  id: number
  is_active: boolean
  is_superuser: boolean
  created_at: string
  updated_at: string
  roles?: Array<string | { name: string }>
}

const AUTH_BASE_PATH = '/auth'
const USERS_BASE_PATH = '/users'

const resolveSessionDuration = () => {
  const fallback = 60
  const raw = Number(import.meta.env.VITE_AUTH_SESSION_TTL_MINUTES ?? fallback)
  if (Number.isFinite(raw) && raw > 0) {
    return raw
  }
  return fallback
}

const SESSION_DURATION_MINUTES = resolveSessionDuration()

const computeExpiration = () => {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000)
  return expiresAt.toISOString()
}

const mapLoginResponse = (response: LoginApiResponse): AuthResponse => {
  const issuedAt = new Date().toISOString()

  return {
    token: response.access_token,
    tokenType: response.token_type ?? 'bearer',
    refreshToken: null,
    issuedAt,
    expiresAt: computeExpiration(),
    user: null,
  }
}

const mapCurrentUserResponse = (payload: CurrentUserApiResponse): AuthUser => ({
  id: String(payload.id),
  username: payload.username,
  email: payload.email,
  fullName: payload.username,
  roles: (payload.roles ?? []).map((role) => (typeof role === 'string' ? role : role.name)) as AuthUser['roles'],
  isActive: payload.is_active,
  isSuperuser: payload.is_superuser,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
  lastLoginAt: payload.updated_at ?? payload.created_at,
})

class AuthService {
  async login(payload: AuthCredentials): Promise<AuthResponse> {
    const credentials = {
      username: payload.username.trim(),
      password: payload.password,
    }

    try {
      const { data } = await apiClient.post<LoginApiResponse>(`${AUTH_BASE_PATH}/login`, credentials)
      return mapLoginResponse(data)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos iniciar sesión.'))
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    try {
      const { data } = await apiClient.get<CurrentUserApiResponse>(`${USERS_BASE_PATH}/me`)
      return mapCurrentUserResponse(data)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos obtener el perfil del usuario.'))
    }
  }

  async logout(): Promise<void> {
    await apiClient.post(`${AUTH_BASE_PATH}/logout`)
  }
}

export const authService = new AuthService()
