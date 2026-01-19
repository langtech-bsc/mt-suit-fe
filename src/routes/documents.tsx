import { lazy } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../features/auth/store/auth.store'

const DocumentTranslatorView = lazy(() =>
  import('../features/translator/views/DocumentTranslatorView').then((module) => ({
    default: module.DocumentTranslatorView,
  })),
)

export const Route = createFileRoute('/documents')({
  beforeLoad: ({ location }) => {
    if (!useAuthStore.getState().isSessionValid()) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href ?? location.pathname ?? '/translator/documents',
          reason: 'unauthorized',
        },
      })
    }
  },
  component: DocumentTranslatorRoute,
})

export function DocumentTranslatorRoute() {
  return <DocumentTranslatorView />
}
