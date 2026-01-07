import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const TranslatorView = lazy(() =>
  import('../features/translator/views/TranslatorView').then((module) => ({
    default: module.TranslatorView,
  })),
)

export const Route = createFileRoute('/translator/')({
  component: TranslatorIndexRoute,
})

function TranslatorIndexRoute() {
  return <TranslatorView />
}
