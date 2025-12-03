import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/auth.store'

export const SessionManager = () => {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    if (!session) {
      return
    }

    const expiresIn = new Date(session.expiresAt).getTime() - Date.now()
    if (Number.isNaN(expiresIn) || expiresIn <= 0) {
      logout().finally(() => {
        navigate({ to: '/login', search: { reason: 'expired' }, replace: true })
      })
      return
    }

    const timerId = globalThis.setTimeout(() => {
      logout().finally(() => {
        navigate({ to: '/login', search: { reason: 'expired' }, replace: true })
      })
    }, expiresIn)

    return () => {
      globalThis.clearTimeout(timerId)
    }
  }, [session, logout, navigate])

  return null
}
