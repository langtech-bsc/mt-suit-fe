import { lazy } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { useAuthStore } from '../features/auth/store/auth.store'
import type { AppRoutePath } from './types'

const LoginView = lazy(() =>
  import('../features/auth/views/LoginView').then((module) => ({
    default: module.LoginView,
  })),
)

const searchSchema = z.object({
  redirect: z.string().optional(),
  reason: z.string().optional(),
})

const allowedRoutes: AppRoutePath[] = ['/', '/about', '/translator', '/ui', '/admin/users', '/admin/languages', '/admin/providers'] // NOSONAR

const sanitizeRedirect = (value?: string | null): AppRoutePath => {
  if (!value) {
    return '/translator'
  }

  try {
    const decoded = decodeURIComponent(value)
    const pathname = decoded.split('?')[0]
    if (allowedRoutes.includes(pathname as AppRoutePath)) {
      return pathname as AppRoutePath
    }
  } catch {
    // noop
  }

  return '/translator'
}

export const Route = createFileRoute('/login')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: ({ search }) => {
    const { session, isSessionValid } = useAuthStore.getState()
    if (session && isSessionValid()) {
      throw redirect({
        to: sanitizeRedirect(search.redirect),
      })
    }
  },
  component: LoginRoute,
})

export function LoginRoute() {
  const { redirect: redirectTo, reason } = Route.useSearch()
  const safeRedirect = sanitizeRedirect(redirectTo)

  return <LoginView redirectTo={safeRedirect} sessionReason={reason ?? null} />
}
