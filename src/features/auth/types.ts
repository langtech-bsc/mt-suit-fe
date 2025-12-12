export type AuthRole = 'translator' | 'reviewer' | 'admin' | (string & {})

export interface AuthUser {
  id: string
  username: string
  email: string
  fullName?: string
  roles: AuthRole[]
  isActive: boolean
  isSuperuser: boolean
  createdAt?: string
  updatedAt?: string
  lastLoginAt?: string
}

export interface AuthCredentials {
  username: string
  password: string
  rememberMe?: boolean
}

export interface AuthResponse {
  token: string
  tokenType: string
  refreshToken: string | null
  expiresAt: string
  issuedAt: string
  user: AuthUser | null
}

export interface AuthSession extends AuthResponse {
  rememberMe: boolean
}

export type AuthStatus = 'idle' | 'authenticating' | 'authenticated' | 'error'
