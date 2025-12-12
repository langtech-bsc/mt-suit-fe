import { lazy } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../features/auth/store/auth.store'
import { isAdminUser } from '../features/auth/utils/authz'

const AdminLanguagesView = lazy(() =>
  import('../features/admin/views/AdminLanguagesView').then((module) => ({
    default: module.AdminLanguagesView,
  })),
)

export const Route = createFileRoute('/admin/languages')({
  beforeLoad: ({ location }) => {
    const { isSessionValid, user } = useAuthStore.getState()
    if (!isSessionValid()) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href ?? location.pathname ?? '/admin/languages',
          reason: 'unauthorized',
        },
      })
    }

    if (!isAdminUser(user)) {
      throw redirect({
        to: '/translator',
        search: {
          reason: 'unauthorized',
        },
      })
    }
  },
  component: AdminLanguagesRoute,
})

function AdminLanguagesRoute() {
  return <AdminLanguagesView />
}

