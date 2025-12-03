import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LanguageSelector } from '../../../components/LanguageSelector'
import { FileUpload } from '../../../components/FileUpload'
import { Alert, Badge, Button, Card } from '../../../components/ui'
import { useAuthStore } from '../../auth/store/auth.store'

export const TranslatorView = () => {
  const navigate = useNavigate()
  const [sourceLang, setSourceLang] = useState('es')
  const [targetLang, setTargetLang] = useState('en')
  const [file, setFile] = useState<File | null>(null)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const displayRoles = useMemo(() => user?.roles ?? [], [user?.roles])

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-bsc-white font-sans text-bsc-blue-dark">
      <header className="bg-bsc-blue-dark text-white shadow-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xs font-bold text-bsc-blue-dark">
              BSC
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-wide">BSC Translation AI</h1>
              <p className="text-xs opacity-80">Barcelona Supercomputing Center</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a className="transition-colors hover:text-gray-200" href="#">
              Traductor
            </a>
            <a className="transition-colors hover:text-gray-200" href="#">
              Historial
            </a>
            <a className="transition-colors hover:text-gray-200" href="#">
              Configuración
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <p className="font-semibold">{user?.fullName ?? 'Usuario'}</p>
              {displayRoles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {displayRoles.map((role) => (
                    <Badge key={role} variant="outline" size="sm">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex flex-grow flex-col px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-bsc-blue-medium">Neural Machine Translation</h2>
          <p className="text-sm text-gray-600">Traducción, grammar checker y post-editing en un solo flujo.</p>
        </div>
        <Card variant="elevated" padding="lg" className="flex flex-grow flex-col gap-6">
          <div className="grid flex-grow grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <LanguageSelector label="Idioma origen" selectedCode={sourceLang} onChange={setSourceLang} />
              <FileUpload onFileSelect={setFile} />
            </div>

            <div className="flex flex-col gap-4">
              <LanguageSelector
                label="Idioma destino"
                selectedCode={targetLang}
                onChange={setTargetLang}
                excludeCode={sourceLang}
              />
              <div className="flex flex-grow flex-col gap-2">
                <label className="text-sm font-medium text-gray-600">Salida</label>
                <div className="flex min-h-[200px] flex-grow items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-700">
                  {file ? (
                    <div className="text-center">
                      <p className="mb-2 text-sm text-gray-500">La traducción aparecerá aquí.</p>
                      <Button variant="ghost" size="sm" disabled>
                        Descargar documento traducido
                      </Button>
                    </div>
                  ) : (
                    <p className="italic text-gray-400">Carga un documento para iniciar la traducción.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl bg-gray-50 p-4">
            <Alert
              variant="info"
              title="Estado del pipeline"
              description="Mientras el backend no esté disponible, simulamos las respuestas internas."
            />
            <div className="flex flex-wrap gap-3">
              <Badge variant="info">Traducción</Badge>
              <Badge variant="info">Grammar Checker</Badge>
              <Badge variant="info">Post-editing</Badge>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="md" disabled>
              <span>Procesar documento</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Button>
          </div>
        </Card>
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Barcelona Supercomputing Center. Todos los derechos reservados.
      </footer>
    </div>
  )
}
