import { Outlet , createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../features/auth/store/auth.store'

export const Route = createFileRoute('/translator')({
  beforeLoad: ({ location }) => {
    if (!useAuthStore.getState().isSessionValid()) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href ?? location.pathname ?? '/translator',
          reason: 'unauthorized',
        },
      })
    }
  },
  component: TranslatorLayout,
})

export function TranslatorLayout() {
  return <Outlet />
}
