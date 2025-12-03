export type AuthRole = 'translator' | 'reviewer' | 'admin'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  roles: AuthRole[]
  lastLoginAt?: string
}

export interface AuthCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface AuthResponse {
  token: string
  refreshToken: string | null
  expiresAt: string
  issuedAt: string
  user: AuthUser
}

export interface AuthSession extends AuthResponse {
  rememberMe: boolean
}

export type AuthStatus = 'idle' | 'authenticating' | 'authenticated' | 'error'
