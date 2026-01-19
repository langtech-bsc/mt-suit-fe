import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Card, Checkbox, Input, PasswordInput } from '../../../components/ui'
import { BrandLogo } from '../../../components/BrandLogo'
import { useAuthStore } from '../store/auth.store'
import type { AppRoutePath } from '../../../routes/types'

type LoginFormValues = {
  username: string
  password: string
  rememberMe?: boolean
}

interface LoginViewProps {
  redirectTo?: AppRoutePath
  sessionReason?: string | null
}

export const LoginView = ({ redirectTo = '/translator', sessionReason }: LoginViewProps) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [genericError, setGenericError] = useState<string | null>(null)
  const status = useAuthStore((state) => state.status)
  const login = useAuthStore((state) => state.login)
  const error = useAuthStore((state) => state.error)

  const loginSchema = useMemo(
    () =>
      z.object({
        username: z.string().min(3, t('login.validation.usernameRequired')),
        password: z.string().min(8, t('login.validation.passwordMin')),
        rememberMe: z.boolean().optional(),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    mode: 'onBlur',
    defaultValues: {
      username: '',
      password: '',
      rememberMe: true,
    },
  })

  const isLoading = status === 'authenticating' || isSubmitting

  const sessionMessage = useMemo(() => {
    if (!sessionReason) {
      return null
    }

    if (sessionReason === 'expired') {
      return t('login.session.expired')
    }

    if (sessionReason === 'unauthorized') {
      return t('login.session.unauthorized')
    }

    return null
  }, [sessionReason, t])

  const submitLabel = isLoading ? t('login.form.submitting') : t('login.form.submit')

  const onSubmit = handleSubmit(async (values) => {
    setGenericError(null)
    const validation = loginSchema.safeParse(values)
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string') {
          setError(field as keyof LoginFormValues, { type: 'manual', message: issue.message })
        }
      }
      return
    }

    try {
      await login(validation.data)
      navigate({ to: redirectTo, replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : t('login.validation.genericFailure')
      setGenericError(message)
    }
  })

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white via-blue-50 to-blue-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
        <section className="flex flex-1 flex-col justify-center gap-6 bg-[#00377b] px-10 py-12 text-white">
          <BrandLogo
            textTone="light"
            label="Barcelona Supercomputing Center"
            tagline="Translation Intelligence Suite"
            className="justify-start"
          />
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-blue-100">{t('login.hero.productName')}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">{t('login.hero.title')}</h1>
            <p className="mt-4 text-base text-blue-100/90">
              {t('login.hero.description')}
            </p>
          </div>
          <ul className="space-y-3 text-sm text-blue-100/90">
            <li className="flex items-center gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
              {t('login.hero.bullet')}
            </li>
          </ul>
        </section>

        <section className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900 px-8 py-12">
          <Card padding="lg" className="w-full max-w-md shadow-2xl  md:p-10">
            <header className="mb-8 space-y-3">
              <BrandLogo showText={false} imgClassName="h-12" className="justify-start" />
              <h2 className="mt-2 text-2xl font-bold text-bsc-blue-dark">{t('login.card.title')}</h2>
              <p className="text-sm text-gray-500">{t('login.card.subtitle')}</p>
            </header>

            <form onSubmit={onSubmit} className="space-y-6">
              {sessionMessage && (
                <Alert variant="warning" title={t('login.alerts.sessionEndedTitle')} description={sessionMessage} />
              )}

              {(genericError || error) && (
                <Alert
                  variant="danger"
                  title={t('login.alerts.loginFailedTitle')}
                  description={genericError ?? error ?? undefined}
                />
              )}

              <Input
                label={t('login.form.usernameLabel')}
                type="text"
                placeholder={t('login.form.usernamePlaceholder')}
                autoComplete="username"
                disabled={isLoading}
                {...register('username')}
                error={errors.username?.message}
              />

              <PasswordInput
                label={t('login.form.passwordLabel')}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                {...register('password')}
                error={errors.password?.message}
              />

              <div className="flex items-center justify-between">
                <Checkbox
                  label={t('login.form.rememberMe')}
                  disabled={isLoading}
                  {...register('rememberMe')}
                />
                {/* <button type="button" className="text-sm font-medium text-bsc-blue-medium hover:text-bsc-blue-dark dark:text-bsc-blue-medium-dark dark:hover:text-white">
                  ¿Olvidaste tu contraseña?
                </button> */}
              </div>

              <Button type="submit" variant="primary" disabled={isLoading} className="w-full justify-center py-3 text-base">
                {submitLabel}
              </Button>
            </form>

            <footer className="mt-8 text-center text-xs text-gray-500">
              {t('login.card.footer')}
            </footer>
          </Card>
        </section>
      </div>
    </div>
  )
}
