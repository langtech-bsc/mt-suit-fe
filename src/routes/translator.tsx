import { lazy } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../features/auth/store/auth.store'

const TranslatorView = lazy(() =>
  import('../features/translator/views/TranslatorView').then((module) => ({
    default: module.TranslatorView,
  })),
)

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
