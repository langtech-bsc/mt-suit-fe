import { createFileRoute, redirect } from '@tanstack/react-router'
import { TranslatorView } from '../features/translator/views/TranslatorView'
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
  component: TranslatorRoute,
})

function TranslatorRoute() {
  return <TranslatorView />
}
