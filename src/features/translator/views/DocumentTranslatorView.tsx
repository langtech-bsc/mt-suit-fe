import { useEffect, useMemo, useState } from 'react'
import { LanguageSelector } from '../../../components/LanguageSelector'
import { FileUpload } from '../../../components/FileUpload'
import { Alert, Badge, Button, Card, Select } from '../../../components/ui'
import { useProvidersQuery } from '../../providers/queries/useProvidersQuery'
import { useLanguagesStore } from '../../languages/store/languages.store'

type DocStatus = 'idle' | 'ready' | 'processing' | 'done'

const OUTPUT_FORMATS = [
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'pdf', label: 'PDF' },
  { value: 'txt', label: 'Texto (.txt)' },
] as const

export function DocumentTranslatorView() {
  const { data: providers, isLoading: isLoadingProviders, error: providersError } = useProvidersQuery()
  const languages = useLanguagesStore((state) => state.languages)

  const [sourceLang, setSourceLang] = useState('')
  const [targetLang, setTargetLang] = useState('')
  const [providerId, setProviderId] = useState<number | ''>('')
  const [outputFormat, setOutputFormat] = useState<(typeof OUTPUT_FORMATS)[number]['value']>('docx')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState<DocStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const defaultSource = useMemo(
    () => languages.find((lang) => lang.isoCode.toLowerCase() === 'es')?.isoCode ?? languages[0]?.isoCode ?? '',
    [languages],
  )
  const defaultTarget = useMemo(
    () => languages.find((lang) => lang.isoCode.toLowerCase() === 'en')?.isoCode ?? languages[1]?.isoCode ?? '',
    [languages],
  )
  const defaultProviderId = useMemo(() => providers?.find((item) => item.isDefault)?.id ?? providers?.[0]?.id ?? '', [providers])

  useEffect(() => {
    setSourceLang(defaultSource)
    setTargetLang(defaultTarget)
  }, [defaultSource, defaultTarget])

  useEffect(() => {
    setProviderId(defaultProviderId)
  }, [defaultProviderId])

  const canProcess = Boolean(selectedFile && sourceLang && targetLang && providerId)
  const progressLabel =
    status === 'processing'
      ? `Procesando documento… ${progress}%`
      : status === 'ready'
        ? 'Listo para traducir'
        : status === 'done'
          ? 'Documento traducido'
          : 'Listo para comenzar'

  const handleTranslate = () => {
    if (!canProcess) {
      setErrorMessage('Sube un documento y selecciona idiomas / modelo.')
      return
    }
    setErrorMessage(null)
    setStatus('processing')
    setProgress(65)
  }

  const handleReset = () => {
    setSelectedFile(null)
    setStatus('idle')
    setProgress(0)
    setErrorMessage(null)
  }

  const providerOptions =
    providers?.map((prov) => ({
      value: String(prov.id),
      label: prov.isDefault ? `${prov.name} · ${prov.providerType} (default)` : `${prov.name} · ${prov.providerType}`,
    })) ?? []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-10 pt-6">
      <Card padding="lg" className="space-y-3 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
          Documentos
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-bsc-blue-dark dark:text-white">Traducción de documentos</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Sube contratos, manuales o PDFs y obtén la traducción con seguimiento en tiempo real.
            </p>
          </div>
         
        </div>
      </Card>

      <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
              Configuración rápida
            </p>
            <h2 className="text-2xl font-semibold text-bsc-blue-dark dark:text-white">Modelo, idiomas y formato</h2>
          </div>
         
        </div>
        <div className="grid gap-3 md:grid-cols-2 ">
         
          <Select
            label="Modelo / Provider"
            value={String(providerId)}
            onChange={(event) => setProviderId(Number(event.target.value))}
            options={providerOptions}
            helperText={isLoadingProviders ? 'Cargando modelos…' : providerOptions.length === 0 ? 'Sin modelos disponibles' : undefined}
            disabled={isLoadingProviders || providerOptions.length === 0}
          />
          <Select
            label="Formato de salida"
            value={outputFormat}
            onChange={(event) => setOutputFormat(event.target.value as (typeof OUTPUT_FORMATS)[number]['value'])}
            options={OUTPUT_FORMATS.map((item) => ({ value: item.value, label: item.label }))}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 ">

         <LanguageSelector label="Idioma origen" selectedCode={sourceLang} onChange={setSourceLang} />
          <LanguageSelector
            label="Idioma destino"
            selectedCode={targetLang}
            onChange={setTargetLang}
            excludeCode={sourceLang}
          />
        </div>
      </Card>

      {errorMessage && (
        <Alert variant="danger" title="Revisa la configuración" description={errorMessage} className="border border-red-200" />
      )}
      {providersError && (
        <Alert variant="warning" title="Modelos no disponibles" description={(providersError as Error).message} />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card padding="lg" className="space-y-4 border border-gray-100 dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">Paso 1</p>
              <h2 className="text-lg font-semibold text-bsc-blue-dark dark:text-white">Carga y configuración</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
              <span>Formatos: PDF, DOCX, TXT</span>
              <span>· Máx. 25 MB</span>
            </div>
          </div>

          <div className="grid gap-4 ">
            <div className="space-y-4">
              <FileUpload onFileSelect={setSelectedFile} />
            </div>

          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleReset}>
              Limpiar
            </Button>
            <Button variant="primary" onClick={handleTranslate} disabled={!canProcess || status === 'processing'}>
              Traducir documento
            </Button>
            
          </div>
        </Card>

        <div className="space-y-4">
          <Card padding="lg" className="space-y-3 border border-gray-100 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">Paso 2</p>
            <h2 className="text-lg font-semibold text-bsc-blue-dark dark:text-white">Seguimiento</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Barra de progreso y estado del documento en tiempo real.
            </p>
            <div className="rounded-xl border border-gray-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between text-sm font-medium text-bsc-blue-dark dark:text-white">
                <span>{progressLabel}</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full bg-bsc-blue-medium transition-all dark:bg-bsc-blue-medium-dark"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                Progreso en vivo del procesamiento y traducción del archivo.
              </p>
            </div>
            <Button variant="outline" className="w-full">
              Descargar
            </Button>
          </Card>

        </div>
      </div>

      <Card padding="lg" className="space-y-2 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-bsc-blue-dark dark:text-white">Notas de integración</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>Traducción de documentos con seguimiento y descarga directa.</li>
          <li>Respeta los idiomas soportados por el modelo seleccionado.</li>
          <li>Soporte para streaming o polling según el proveedor.</li>
          <li>Descarga habilitada tras finalizar el procesamiento.</li>
        </ul>
      </Card>
    </div>
  )
}
