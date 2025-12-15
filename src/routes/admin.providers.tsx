import { lazy } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../features/auth/store/auth.store'
import { isAdminUser } from '../features/auth/utils/authz'

const AdminProvidersView = lazy(() =>
  import('../features/admin/views/AdminProvidersView').then((module) => ({
    default: module.AdminProvidersView,
  })),
)

export const Route = createFileRoute('/admin/providers')({
  beforeLoad: ({ location }) => {
    const { isSessionValid, user } = useAuthStore.getState()
    if (!isSessionValid()) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href ?? location.pathname ?? '/admin/providers',
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
  component: AdminProvidersRoute,
})

function AdminProvidersRoute() {
  return <AdminProvidersView />
}

