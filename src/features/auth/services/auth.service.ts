import apiClient from '../../../api/apiClient'
import type { AuthCredentials, AuthResponse, AuthUser } from '../types'

interface LoginApiResponse {
  access_token: string
  token_type: string
}

const AUTH_BASE_PATH = '/auth'

const resolveSessionDuration = () => {
  const fallback = 60
  const raw = Number(fallback)
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

const buildUserFrom = (username: string, issuedAt: string): AuthUser => {
  const normalized = username.trim()
  return {
    id: normalized,
    email: normalized,
    fullName: normalized,
    roles: [],
    lastLoginAt: issuedAt,
  }
}

const mapLoginResponse = (payload: AuthCredentials, response: LoginApiResponse): AuthResponse => {
  const issuedAt = new Date().toISOString()

  return {
    token: response.access_token,
    tokenType: response.token_type ?? 'bearer',
    refreshToken: null,
    issuedAt,
    expiresAt: computeExpiration(),
    user: buildUserFrom(payload.username, issuedAt),
  }
}

class AuthService {
  async login(payload: AuthCredentials): Promise<AuthResponse> {
    const credentials = {
      username: payload.username.trim(),
      password: payload.password,
    }

    const { data } = await apiClient.post<LoginApiResponse>(`${AUTH_BASE_PATH}/login`, credentials)
    return mapLoginResponse(payload, data)
  }

  async logout(): Promise<void> {
    await apiClient.post(`${AUTH_BASE_PATH}/logout`)
  }
}

export const authService = new AuthService()
