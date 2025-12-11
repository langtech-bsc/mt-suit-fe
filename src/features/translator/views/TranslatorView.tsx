import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Document, Packer, Paragraph } from 'docx'
import { LanguageSelector } from '../../../components/LanguageSelector'
import { Alert, Button, Card, Select, Textarea } from '../../../components/ui'
import {
  requestGrammarCheck,
  requestPostEditing,
  requestTranslation,
  type TranslatorMode,
} from '../services/translator.service'

const MAX_CHARACTERS = 25_000
const EXPORT_FORMATS = [
  { value: 'txt', label: 'Texto (.txt)' },
  { value: 'docx', label: 'Word (.docx)' },
] as const

const MODE_CONFIG: Record<TranslatorMode, { label: string; description: string; actionLabel: string }> = {
  translate: {
    label: 'Traductor',
    description: 'Genera una traducción inmediata con los idiomas seleccionados.',
    actionLabel: 'Traducir',
  },
  grammar: {
    label: 'Grammar Checker',
    description: 'Analiza gramática y ortografía en el mismo idioma de entrada.',
    actionLabel: 'Corregir gramática',
  },
  'post-editing': {
    label: 'Post-Editing',
    description: 'Refina la traducción pegada en el panel derecho para mejorar estilo y fluidez.',
    actionLabel: 'Mejorar traducción (Post-Editing)',
  },
}

type ExportFormat = (typeof EXPORT_FORMATS)[number]['value']
type StatusState = { variant: 'info' | 'success' | 'warning' | 'danger'; title: string; description: string }

export const TranslatorView = () => {
  const [mode, setMode] = useState<TranslatorMode>('translate')
  const [sourceLang, setSourceLang] = useState('es')
  const [targetLang, setTargetLang] = useState('en')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [status, setStatus] = useState<StatusState | null>(null)
  const [charError, setCharError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activeConfig = useMemo(() => MODE_CONFIG[mode], [mode])
  const inputCharacters = inputText.length
  const canProcess =
    mode === 'post-editing' ? outputText.trim().length > 0 : inputText.trim().length > 0 && !charError
  const isExportDisabled = outputText.trim().length === 0 || isProcessing

  useEffect(() => {
    setOutputText('')
    setStatus(null)
  }, [mode])

  const handleModeChange = (nextMode: TranslatorMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
  }

  const handleSwapLanguages = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
  }

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target
    if (value.length > MAX_CHARACTERS) {
      setCharError('Has alcanzado el máximo de 25.000 caracteres. El texto se recortó automáticamente.')
      setInputText(value.slice(0, MAX_CHARACTERS))
      return
    }
    if (charError) {
      setCharError(null)
    }
    setInputText(value)
  }

  const resetInput = () => {
    setInputText('')
    setUploadedFileName(null)
    setFileError(null)
    setCharError(null)
  }

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('text') && !file.name.toLowerCase().endsWith('.txt')) {
      setFileError('Formato no soportado. Utiliza archivos .txt o texto plano.')
      return
    }

    try {
      const text = await file.text()
      if (text.length > MAX_CHARACTERS) {
        setCharError('El archivo supera el límite de 25.000 caracteres. Se cargó solo la primera parte.')
      } else {
        setCharError(null)
      }
      setInputText(text.slice(0, MAX_CHARACTERS))
      setUploadedFileName(file.name)
      setFileError(null)
    } catch (error) {
      console.error(error)
      setFileError('No pudimos leer el archivo. Inténtalo de nuevo.')
    }
  }

  const triggerFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleProcess = async () => {
    if (isProcessing) return

    if (!canProcess) {
      const message =
        mode === 'post-editing'
          ? 'Pega o genera una traducción en el panel derecho antes de mejorarla.'
          : 'Escribe o carga al menos un carácter en el panel izquierdo para continuar.'
      setStatus({
        variant: 'warning',
        title: 'Falta contenido',
        description: message,
      })
      return
    }

    setIsProcessing(true)
    setStatus({
      variant: 'info',
      title: 'Procesando',
      description: `${activeConfig.actionLabel} en curso. Esto puede tardar unos segundos…`,
    })

    try {
      let result = ''
      if (mode === 'translate') {
        result = await requestTranslation({
          text: inputText.trim(),
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
        })
      } else if (mode === 'grammar') {
        result = await requestGrammarCheck({
          text: inputText.trim(),
          language: sourceLang,
        })
      } else {
        result = await requestPostEditing({
          text: outputText.trim(),
          language: targetLang,
        })
      }

      setOutputText(result)
      setStatus({
        variant: 'success',
        title: 'Listo',
        description: `${activeConfig.label} completado correctamente.`,
      })
    } catch (error) {
      const description = error instanceof Error ? error.message : 'No pudimos completar la operación.'
      setStatus({
        variant: 'danger',
        title: 'Error en la solicitud',
        description,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExport = async () => {
    if (isExportDisabled) return
    const text = outputText.trim()
    if (!text) return

    if (exportFormat === 'txt') {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      downloadBlob(blob, `resultado-${mode}.txt`)
      return
    }

    const paragraphs = text.split('\n').map((line) => new Paragraph(line ?? ' '))
    const document = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    })
    const blob = await Packer.toBlob(document)
    downloadBlob(blob, `resultado-${mode}.docx`)
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleClearResult = () => {
    setOutputText('')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-blue-50/40 to-blue-100/20 px-4 py-8 text-slate-900 dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50 sm:px-6 lg:px-10">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
        <header className="space-y-3 rounded-3xl bg-white/80 p-6 shadow-sm backdrop-blur dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bsc-blue-medium">Módulo avanzado</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-bsc-blue-dark dark:text-white">Traductor inteligente BSC</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Traducción estándar, corrección gramatical y postedición integrados en un solo flujo.
              </p>
            </div>
            <div className="rounded-2xl bg-bsc-blue-medium/10 px-4 py-2 text-sm text-bsc-blue-medium dark:bg-bsc-blue-medium/20">
              Máximo {MAX_CHARACTERS.toLocaleString('es-ES')} caracteres
            </div>
          </div>
        </header>

        {status && (
          <Alert variant={status.variant} title={status.title} description={status.description} className="shadow-sm" />
        )}

        <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.3em] text-bsc-blue-medium">Modo de trabajo</p>
            <h2 className="text-2xl font-semibold text-bsc-blue-dark dark:text-white">{activeConfig.label}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{activeConfig.description}</p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            {(Object.keys(MODE_CONFIG) as TranslatorMode[]).map((item) => {
              const isActive = item === mode
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleModeChange(item)}
                  className={`rounded-full border px-5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring ${
                    isActive
                      ? 'border-bsc-blue-medium bg-bsc-blue-medium text-white shadow'
                      : 'border-gray-300 bg-white/70 text-gray-600 hover:border-bsc-blue-medium/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {MODE_CONFIG[item].label}
                </button>
              )
            })}
          </div>
        </Card>

        <Card padding="lg" className="space-y-6 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="flex-1">
              <LanguageSelector label="Idioma origen" selectedCode={sourceLang} onChange={setSourceLang} />
            </div>
            <div className="flex items-center justify-center lg:pt-7">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Intercambiar idiomas"
                onClick={handleSwapLanguages}
                disabled={isProcessing}
              >
                <SwapIcon />
                Intercambiar
              </Button>
            </div>
            <div className="flex-1">
              <LanguageSelector
                label="Idioma destino"
                selectedCode={targetLang}
                onChange={setTargetLang}
                excludeCode={sourceLang}
              />
              {mode === 'grammar' && (
                <p className="pt-1 text-xs text-slate-500">
                  El modo Grammar Checker trabaja en el idioma origen, este selector es solo referencial.
                </p>
              )}
            </div>
          </div>
        </Card>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-bsc-blue-medium">Panel izquierdo</p>
                <h3 className="text-xl font-semibold text-bsc-blue-dark dark:text-white">Texto origen</h3>
              </div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                {inputCharacters.toLocaleString('es-ES')} / {MAX_CHARACTERS.toLocaleString('es-ES')}
              </div>
            </div>
            <Textarea
              placeholder="Escribe, pega o importa tu texto aquí…"
              rows={14}
              value={inputText}
              onChange={handleInputChange}
              className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
              helperText={!charError ? 'Este texto alimenta los modos Translate y Grammar Checker.' : undefined}
              error={charError ?? undefined}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={triggerFileDialog} disabled={isProcessing}>
                Subir archivo
              </Button>
              {uploadedFileName && (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Cargado: <span className="font-medium">{uploadedFileName}</span>
                </span>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={resetInput} disabled={isProcessing}>
                Limpiar texto
              </Button>
            </div>
            {fileError && <p className="text-xs text-red-500">{fileError}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={handleFileSelection}
            />
          </Card>

          <Card padding="lg" className="relative space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-bsc-blue-medium">Panel derecho</p>
                <h3 className="text-xl font-semibold text-bsc-blue-dark dark:text-white">Resultado</h3>
                {mode === 'post-editing' ? (
                  <p className="text-xs text-slate-500">Pega aquí la traducción a mejorar, el resultado reemplazará este contenido.</p>
                ) : (
                  <p className="text-xs text-slate-500">Mostramos la salida del flujo activo. Se limpia al cambiar de modo.</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                  className="min-w-[140px] bg-white dark:bg-slate-800"
                >
                  {EXPORT_FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="primary" size="sm" onClick={handleExport} disabled={isExportDisabled}>
                  Exportar
                </Button>
              </div>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Aquí verás la traducción, corrección gramatical o postedición."
                rows={14}
                value={outputText}
                onChange={(event) => {
                  if (mode === 'post-editing') {
                    setOutputText(event.target.value)
                  }
                }}
                readOnly={mode !== 'post-editing' || isProcessing}
                className="bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
              />
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
                  <div className="flex items-center gap-3 text-sm font-semibold text-bsc-blue-medium">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-bsc-blue-medium border-t-transparent" />Procesando solicitud…
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Estado: <strong className="font-semibold">{status ? status.title : 'Pendiente'}</strong>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearResult} disabled={!outputText || isProcessing}>
                Vaciar panel
              </Button>
            </div>
          </Card>
        </section>

        <Card padding="lg" className="flex flex-col gap-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="primary" size="md" onClick={handleProcess} disabled={!canProcess || isProcessing}>
              {isProcessing ? 'Procesando…' : activeConfig.actionLabel}
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={() => setStatus(null)} disabled={isProcessing}>
              Ocultar estado
            </Button>
          </div>
          <Alert
            variant="neutral"
            title="Consejos rápidos"
            description="Puedes alternar entre modos sin perder el texto de entrada. El panel derecho se reinicia automáticamente para evitar confusiones y el botón Exportar se activa solo cuando hay resultado."
            className="bg-slate-50 dark:bg-slate-800"
          />
        </Card>
      </main>
      <footer className="mt-8 border-t border-gray-200 pt-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        © {new Date().getFullYear()} Barcelona Supercomputing Center · BSC Translator Suite
      </footer>
    </div>
  )
}

const SwapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3l4 4-4 4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 21l-4-4 4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 17h16" />
  </svg>
)
