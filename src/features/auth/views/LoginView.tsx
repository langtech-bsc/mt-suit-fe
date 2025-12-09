import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Button, Card, Checkbox, Input } from '../../../components/ui'
import { BrandLogo } from '../../../components/BrandLogo'
import { useAuthStore } from '../store/auth.store'
import type { AppRoutePath } from '../../../routes/types'

const loginSchema = z.object({
  email: z
    .email({ message: 'Ingresa un email válido.' })
    .min(1, 'El email es obligatorio.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  rememberMe: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginViewProps {
  redirectTo?: AppRoutePath
  sessionReason?: string | null
}

export const LoginView = ({ redirectTo = '/translator', sessionReason }: LoginViewProps) => {
  const navigate = useNavigate()
  const [genericError, setGenericError] = useState<string | null>(null)
  const status = useAuthStore((state) => state.status)
  const login = useAuthStore((state) => state.login)
  const error = useAuthStore((state) => state.error)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    mode: 'onBlur',
    defaultValues: {
      email: '',
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
      return 'Tu sesión expiró, por favor vuelve a iniciar sesión para continuar.'
    }

    if (sessionReason === 'unauthorized') {
      return 'Inicia sesión para acceder al Traductor.'
    }

    return null
  }, [sessionReason])

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
      const message = err instanceof Error ? err.message : 'No pudimos iniciar sesión, intenta nuevamente.'
      setGenericError(message)
    }
  })

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white via-blue-50 to-blue-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
        <section className="flex flex-1 flex-col justify-center gap-6 bg-bsc-blue-dark/95 px-10 py-12 text-white">
          <BrandLogo
            textTone="light"
            label="Barcelona Supercomputing Center"
            tagline="Translation Intelligence Suite"
            className="justify-start"
          />
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-blue-100">BSC Translation</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">Accede al panel de Traducción Inteligente</h1>
            <p className="mt-4 text-base text-blue-100/90">
              Traducción neural, grammar checker y post-editing en un único espacio seguro para equipos del BSC.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-blue-100/90">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" /> {" "}
              Experiencia consistente para traducción, grammar checker y post-editing.
            </li>
          </ul>
        </section>

        <section className="flex flex-1 items-center justify-center bg-white px-8 py-12">
          <Card padding="lg" className="w-full max-w-md shadow-2xl shadow-blue-100 md:p-10">
            <header className="mb-8 space-y-3">
              <BrandLogo showText={false} imgClassName="h-12" className="justify-start" />
              <p className="text-sm font-semibold uppercase tracking-wide text-bsc-blue-medium">Inicio de sesión</p>
              <h2 className="mt-2 text-2xl font-bold text-bsc-blue-dark">Bienvenido de nuevo</h2>
              <p className="text-sm text-gray-500">Usa tus credenciales corporativas para continuar.</p>
            </header>

            <form onSubmit={onSubmit} className="space-y-6">
              {sessionMessage && (
                <Alert variant="warning" title="Sesión finalizada" description={sessionMessage} />
              )}

              {(genericError || error) && (
                <Alert variant="danger" title="No pudimos iniciar sesión" description={genericError ?? error ?? undefined} />
              )}

              <Input
                label="Correo electrónico"
                type="email"
                placeholder="usuario@bsc.es"
                autoComplete="email"
                disabled={isLoading}
                {...register('email')}
                error={errors.email?.message}
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                {...register('password')}
                error={errors.password?.message}
              />

              <div className="flex items-center justify-between">
                <Checkbox
                  label="Recordar sesión"
                  description="Mantente autenticado en este dispositivo."
                  disabled={isLoading}
                  {...register('rememberMe')}
                />
                <button type="button" className="text-sm font-medium text-bsc-blue-medium hover:text-bsc-blue-dark">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button type="submit" variant="primary" disabled={isLoading} className="w-full justify-center py-3 text-base">
                {isLoading ? 'Validando credenciales...' : 'Ingresar'}
              </Button>
            </form>

            <footer className="mt-8 text-center text-xs text-gray-500">
              Si necesitas acceso, contacta a Seguridad TI BSC.
            </footer>
          </Card>
        </section>
      </div>
    </div>
  )
}
