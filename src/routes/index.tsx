import { Link, createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui'
import { BrandLogo } from '../components/BrandLogo'

export const Route = createFileRoute('/')({
  component: Index,
})

export function Index() {
  const { t } = useTranslation()

  const features = useMemo(
    () => [
      {
        caption: t('home.features.auth.caption'),
        title: t('home.features.auth.title'),
        description: t('home.features.auth.description'),
      },
      {
        caption: t('home.features.unified.caption'),
        title: t('home.features.unified.title'),
        description: t('home.features.unified.description'),
      },
      {
        caption: t('home.features.observability.caption'),
        title: t('home.features.observability.title'),
        description: t('home.features.observability.description'),
      },
    ],
    [t],
  )

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <section className="rounded-3xl bg-gradient-to-r from-[#00377b] via-bsc-blue-medium to-sky-500 p-10 text-white shadow-2xl space-y-3">
        <BrandLogo textTone="light" tagline={t('home.hero.brandTagline')} className="justify-start" />
        <p className="text-sm uppercase tracking-[0.3em] text-white/70">{t('home.hero.productName')}</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">{t('home.hero.title')}</h1>
        <p className="mt-3 text-base text-white/80">{t('home.hero.description')}</p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            to="/login"
            search={{ redirect: '/translator' }}
            className="inline-flex items-center justify-center rounded-lg text-[#00377b] bg-white px-6 py-3 text-base font-semibold  shadow-lg transition hover:bg-white"
          >
            {t('home.hero.ctaTranslator')}
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center justify-center rounded-lg border border-white/70 px-6 py-3 text-base font-semibold text-white/90 transition hover:bg-white/10"
          >
            {t('home.hero.ctaAbout')}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} padding="lg" className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-bsc-blue-medium dark:text-bsc-blue-medium-dark">{feature.caption}</p>
            <h3 className="text-xl font-semibold text-bsc-blue-dark">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </Card>
        ))}
      </section>
    </div>
  )
}
