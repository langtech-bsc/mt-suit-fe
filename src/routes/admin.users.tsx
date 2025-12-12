import { lazy } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../features/auth/store/auth.store'

const AdminUsersView = lazy(() =>
  import('../features/admin/views/AdminUsersView').then((module) => ({
    default: module.AdminUsersView,
  })),
)

export const Route = createFileRoute('/admin/users')({
  beforeLoad: ({ location }) => {
    const { isSessionValid, user } = useAuthStore.getState()
    if (!isSessionValid()) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href ?? location.pathname ?? '/admin/users',
          reason: 'unauthorized',
        },
      })
    }

    if (!user?.isSuperuser) {
      throw redirect({
        to: '/translator',
        search: {
          reason: 'unauthorized',
        },
      })
    }
  },
  component: AdminUsersRoute,
})

function AdminUsersRoute() {
  return <AdminUsersView />
}
