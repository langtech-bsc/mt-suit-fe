import type { AuthSession } from '../types'

const STORAGE_KEY = 'bsc.auth.session'
const SESSION_EVENT = 'bsc.auth.session.updated'

const safeParse = (value: string | null) => {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value) as AuthSession
  } catch {
    return null
  }
}

const readFrom = (storage: Storage) => safeParse(storage.getItem(STORAGE_KEY))

const removeFrom = (storage: Storage) => {
  storage.removeItem(STORAGE_KEY)
}

export const AuthStorage = {
  persistSession(session: AuthSession) {
    if (typeof globalThis === 'undefined') {
      return
    }
    const target = session.rememberMe ? globalThis.localStorage : globalThis.sessionStorage
    const serialized = JSON.stringify(session)
    target.setItem(STORAGE_KEY, serialized)
    const secondary = session.rememberMe ? globalThis.sessionStorage : globalThis.localStorage
    removeFrom(secondary)

    try {
      globalThis.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }))
    } catch {
      // noop
    }
  },
  getSession(): AuthSession | null {
    if (typeof globalThis === 'undefined') {
      return null
    }
    return readFrom(globalThis.localStorage) ?? readFrom(globalThis.sessionStorage)
  },
  clearSession() {
    if (typeof globalThis === 'undefined') {
      return
    }
    removeFrom(globalThis.localStorage)
    removeFrom(globalThis.sessionStorage)
    try {
      globalThis.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: null }))
    } catch {
      // noop
    }
  },
}

export const AUTH_SESSION_EVENT = SESSION_EVENT
