import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LanguageSelector } from '../../../components/LanguageSelector'
import { Alert, Badge, Button, Card, Textarea } from '../../../components/ui'
import { useAuthStore } from '../../auth/store/auth.store'

const TASKS = [
  {
    id: 'translation',
    label: 'Traducción',
    description: 'Traducción automática con ajustes terminológicos.',
  },
  {
    id: 'post-editing',
    label: 'Posedición',
    description: 'Mejora una salida existente corrigiendo estilo y errores.',
  },
  {
    id: 'grammar',
    label: 'Revisión gramatical',
    description: 'Analiza el texto y propone correcciones lingüísticas.',
  },
] as const

type TaskId = (typeof TASKS)[number]['id']

export const TranslatorView = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [task, setTask] = useState<TaskId>('translation')
  const [sourceLang, setSourceLang] = useState('es')
  const [targetLang, setTargetLang] = useState('en')
  const [file, setFile] = useState<File | null>(null)
  const [inputText, setInputText] = useState('')
  const [machineTranslation, setMachineTranslation] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<{ variant: 'info' | 'success' | 'warning' | 'danger'; message: string } | null>(
    null,
  )

  const displayRoles = useMemo(() => user?.roles ?? [], [user?.roles])
  const selectedTask = useMemo(() => TASKS.find((item) => item.id === task), [task])
  const showMachineTranslation = task === 'post-editing'

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  const handleProcess = () => {
    if (!inputText && !file) {
      setStatus({
        variant: 'warning',
        message: 'Añade un texto o documento para iniciar el flujo.',
      })
      return
    }

    setStatus({
      variant: 'info',
      message: 'Procesando con el motor simulado…',
    })
    setIsProcessing(true)

    globalThis.setTimeout(() => {
      const summary = `Resultado ${task === 'grammar' ? 'del análisis' : 'de la traducción'} (${sourceLang} → ${targetLang}).`
      setOutputText(`${summary}\n\n${inputText || 'Documento adjunto listo para descarga.'}`)
      setStatus({
        variant: 'success',
        message: 'Flujo completado. Este resultado es simulado hasta conectar con el backend.',
      })
      setIsProcessing(false)
    }, 1100)
  }

  const handleReset = () => {
    setInputText('')
    setMachineTranslation('')
    setOutputText('')
    setFile(null)
    setStatus(null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-blue-50/40 to-blue-100/20 font-sans text-bsc-blue-dark">
      <header className="bg-bsc-blue-dark/95 text-white shadow-lg">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xs font-bold text-bsc-blue-dark">
              BSC
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-wide">BSC Translation AI</h1>
              <p className="text-xs opacity-80">Barcelona Supercomputing Center</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <p className="font-semibold">{user?.fullName ?? 'Usuario'}</p>
              {displayRoles.length > 0 && (
                <div className="flex flex-wrap justify-end gap-1">
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

      <main className="container mx-auto flex flex-grow flex-col gap-6 px-6 py-10">
        <section className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-bsc-blue-medium">Flujo inteligente</p>
          <h2 className="text-3xl font-semibold text-bsc-blue-dark">Traductor, posedición y revisión gramatical</h2>
          <p className="text-sm text-gray-600">
            Selecciona el flujo, define idiomas y ofrece texto o documentos. Te mostraremos el resultado simulado mientras
            se integra el backend.
          </p>
        </section>

        {status && (
          <Alert variant={status.variant} title="Estado" description={status.message} className="shadow-sm" />
        )}

        <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-bsc-blue-medium">Selecciona una tarea</p>
              <h3 className="text-lg font-semibold text-bsc-blue-dark">{selectedTask?.label}</h3>
              <p className="text-sm text-gray-600">{selectedTask?.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            {TASKS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTask(item.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  task === item.id
                    ? 'border-bsc-blue-medium bg-bsc-blue-medium text-white shadow'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-bsc-blue-medium/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="space-y-6 border border-gray-100 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <LanguageSelector label="Idioma origen" selectedCode={sourceLang} onChange={setSourceLang} />
            <LanguageSelector
              label="Idioma destino"
              selectedCode={targetLang}
              onChange={setTargetLang}
              excludeCode={sourceLang}
            />
          </div>
          <div className="rounded-xl bg-blue-50/60 p-4 text-sm text-bsc-blue-dark">
            Recuerda validar la combinación de idiomas antes de ejecutar el flujo. El motor actual soporta los conjuntos
            europeos cargados en la demo.
          </div>
        </Card>

        <Card padding="lg" className="space-y-6 border border-gray-100 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-1">
            <Textarea
              label="Texto de entrada"
              placeholder="Ingresa el texto origen o pega segmentos. También puedes alternar con un documento adjunto."
              rows={showMachineTranslation ? 10 : 12}
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
            />
            {/* <div className="flex-1 overflow-auto">
              <FileUpload onFileSelect={setFile} />
              <p className="text-xs text-gray-500">
                El archivo se prioriza sobre el texto manual cuando ambos están presentes. Formatos permitidos: txt, pdf,
                docx, pptx.
              </p>
            </div> */}
          </div>

          {showMachineTranslation && (
            <Textarea
              label="Traducción automática (opcional)"
              placeholder="Solo para posedición: pega aquí la traducción a refinar."
              rows={6}
              value={machineTranslation}
              onChange={(event) => setMachineTranslation(event.target.value)}
            />
          )}
        </Card>

        <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm">
          <Textarea
            label="Resultado"
            placeholder="El resultado aparecerá aquí una vez completado el flujo."
            rows={8}
            value={outputText}
            readOnly
            className="bg-gray-50"
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Alert
              variant="neutral"
              title="Demo simulada"
              description="Cuando el backend esté listo, este bloque mostrará la salida real con descarga habilitada."
              className="flex-1 bg-gray-50"
            />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleReset} disabled={isProcessing}>
                Limpiar
              </Button>
              <Button variant="primary" onClick={handleProcess} disabled={isProcessing}>
                {isProcessing ? 'Procesando…' : 'Ejecutar flujo'}
              </Button>
            </div>
          </div>
        </Card>
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Barcelona Supercomputing Center. Todos los derechos reservados.
      </footer>
    </div>
  )
}
