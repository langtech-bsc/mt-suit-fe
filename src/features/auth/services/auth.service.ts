import apiClient from '../../../api/apiClient'
import type { AuthCredentials, AuthResponse, AuthUser } from '../types'

interface MockUser extends AuthUser {
  password: string
}

const MOCK_USERS: MockUser[] = [
  {
    id: 'u-translator',
    email: 'translator@bsc.es',
    fullName: 'BSC Translator',
    roles: ['translator'],
    password: 'Bsc12345!',
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'u-admin',
    email: 'admin@bsc.es',
    fullName: 'BSC Admin',
    roles: ['admin', 'translator'],
    password: 'AdminSecure1!',
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
]

const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH !== 'false'

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const buildMockResponse = (user: MockUser): AuthResponse => {
  const issuedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  return {
    token: `mock-token-${crypto.randomUUID()}`,
    refreshToken: `mock-refresh-${crypto.randomUUID()}`,
    issuedAt,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      lastLoginAt: issuedAt,
    },
  }
}

const mockLogin = async (payload: AuthCredentials): Promise<AuthResponse> => {
  await delay(800)
  const normalizedEmail = payload.email.trim().toLowerCase()
  const user = MOCK_USERS.find((candidate) => candidate.email === normalizedEmail)

  if (!user || user.password !== payload.password) {
    const error = new Error('Credenciales inválidas, verifica email y contraseña.')
    error.name = 'AuthError'
    throw error
  }

  return buildMockResponse(user)
}

const mockRefresh = async (): Promise<AuthResponse> => {
  await delay(300)
  const [user] = MOCK_USERS
  return buildMockResponse(user)
}

class AuthService {
  async login(payload: AuthCredentials): Promise<AuthResponse> {
    if (USE_MOCK_AUTH) {
      return mockLogin(payload)
    }

    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
    return data
  }

  async refreshToken(refreshToken: string | null): Promise<AuthResponse> {
    if (!refreshToken) {
      throw new Error('No refresh token available.')
    }

    if (USE_MOCK_AUTH) {
      return mockRefresh()
    }

    const { data } = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken })
    return data
  }

  async logout(): Promise<void> {
    if (USE_MOCK_AUTH) {
      await delay(150)
      return
    }

    await apiClient.post('/auth/logout')
  }
}

export const authService = new AuthService()
