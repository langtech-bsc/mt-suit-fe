import { create } from 'zustand'
import { authService } from '../services/auth.service'
import type { AuthCredentials, AuthSession, AuthStatus, AuthUser } from '../types'
import { AuthStorage } from '../utils/authStorage'

interface AuthStoreState {
  status: AuthStatus
  session: AuthSession | null
  user: AuthUser | null
  error: string | null
  login: (payload: AuthCredentials) => Promise<void>
  logout: () => Promise<void>
  fetchProfile: () => Promise<AuthUser | null>
  restoreSession: () => void
  isSessionValid: () => boolean
  setSession: (session: AuthSession | null) => void
}

const getInitialSession = (): AuthSession | null => {
  const stored = AuthStorage.getSession()
  if (!stored) {
    return null
  }

  const expiresIn = new Date(stored.expiresAt).getTime() - Date.now()
  if (Number.isNaN(expiresIn) || expiresIn <= 0) {
    AuthStorage.clearSession()
    return null
  }

  return stored
}

const initialSession = getInitialSession()

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  status: initialSession ? 'authenticated' : 'idle',
  session: initialSession,
  user: initialSession?.user ?? null,
  error: null,
  async login(payload) {
    set({ status: 'authenticating', error: null })
    try {
      const response = await authService.login(payload)
      let session: AuthSession = {
        ...response,
        rememberMe: Boolean(payload.rememberMe),
      }
      AuthStorage.persistSession(session)
      const user = await authService.getCurrentUser()
      session = { ...session, user }
      AuthStorage.persistSession(session)
      set({ status: 'authenticated', session, user, error: null })
    } catch (error) {
      AuthStorage.clearSession()
      const message = error instanceof Error ? error.message : 'No pudimos iniciar sesión.'
      set({ status: 'error', error: message, session: null, user: null })
      throw error
    }
  },
  async fetchProfile() {
    const session = get().session
    if (!session) {
      return null
    }
    const user = await authService.getCurrentUser()
    const updatedSession: AuthSession = { ...session, user }
    AuthStorage.persistSession(updatedSession)
    set({ session: updatedSession, user, status: 'authenticated' })
    return user
  },
  async logout() {
    try {
      await authService.logout()
    } finally {
      AuthStorage.clearSession()
      set({ status: 'idle', session: null, user: null, error: null })
    }
  },
  restoreSession() {
    const stored = getInitialSession()
    const current = get().session

    if (stored) {
      if (!current || current.token !== stored.token) {
        set({ session: stored, user: stored.user, status: 'authenticated', error: null })
        if (!stored.user) {
          get().fetchProfile()
        }
      }
      return
    }

    if (current) {
      set({ session: null, user: null, status: 'idle', error: null })
    }
  },
  isSessionValid() {
    const { session } = get()
    if (!session) {
      return false
    }
    const remaining = new Date(session.expiresAt).getTime() - Date.now()
    return remaining > 0
  },
  setSession(session) {
    if (!session) {
      AuthStorage.clearSession()
      set({ status: 'idle', session: null, user: null })
      return
    }
    AuthStorage.persistSession(session)
    set({ status: 'authenticated', session, user: session.user })
  },
}))
