import { Link, createFileRoute } from '@tanstack/react-router'
import { Card } from '../components/ui'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <section className="rounded-3xl bg-gradient-to-r from-bsc-blue-dark via-bsc-blue-medium to-sky-500 p-10 text-white shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-white/70">BSC Translation</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">Traductor especializado con governance y control de acceso</h1>
        <p className="mt-3 text-base text-white/80">
          Gestiona traducción, grammar checker y post-editing en una única interfaz segura con autenticación corporativa.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            to="/login"
            search={{ redirect: '/translator' }}
            className="inline-flex items-center justify-center rounded-lg bg-white/90 px-6 py-3 text-base font-semibold text-bsc-blue-dark shadow-lg transition hover:bg-white"
          >
            Ingresar al Traductor
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center justify-center rounded-lg border border-white/70 px-6 py-3 text-base font-semibold text-white/90 transition hover:bg-white/10"
          >
            Conoce el proyecto
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} padding="lg" className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-bsc-blue-medium">{feature.caption}</p>
            <h3 className="text-xl font-semibold text-bsc-blue-dark">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </Card>
        ))}
      </section>
    </div>
  )
}

const features = [
  {
    caption: 'Autenticación',
    title: 'SSO + Roles',
    description: 'Acceso restringido con control de sesión y validación de roles para cada módulo.',
  },
  {
    caption: 'Experiencia unificada',
    title: 'Traducción completa',
    description: 'Traducción neural, grammar checker y post-edición integradas en un mismo flujo.',
  },
  {
    caption: 'Observabilidad',
    title: 'Auditoría & Logs',
    description: 'Seguimiento de sesiones para detectar expiraciones y tracear actividad crítica.',
  },
]
