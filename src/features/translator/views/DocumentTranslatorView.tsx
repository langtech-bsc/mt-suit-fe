import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../../components/LanguageSelector'
import { FileUpload } from '../../../components/FileUpload'
import { Alert, Button, Card, Select } from '../../../components/ui'
import { useProvidersQuery } from '../../providers/queries/useProvidersQuery'
import { useLanguagesStore } from '../../languages/store/languages.store'
import { documentTranslationService, type DocumentTranslationResult } from '../services/documentTranslation.service'
import {
  DOCUMENT_TRANSLATION_ACCEPT,
  DOCUMENT_TRANSLATION_FORMATS_LABEL,
  DOCUMENT_TRANSLATION_SUPPORTED_EXTENSIONS,
  type DocumentTranslationSupportedExtension,
} from '../../../constants/fileTypes'

type DocStatus = 'idle' | 'ready' | 'processing' | 'done'

const OUTPUT_FORMATS = ['docx', 'txt'] as const
type OutputFormat = (typeof OUTPUT_FORMATS)[number]

export function DocumentTranslatorView() {
  const { t } = useTranslation()
  const { data: providers, isLoading: isLoadingProviders, error: providersError } = useProvidersQuery()
  const languages = useLanguagesStore((state) => state.languages)

  const [sourceLang, setSourceLang] = useState('')
  const [targetLang, setTargetLang] = useState('')
  const [providerId, setProviderId] = useState<number | ''>('')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('docx')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState<DocStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<DocumentTranslationResult | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

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

  const getProgressLabel = (currentStatus: DocStatus, currentProgress: number): string => {
    if (currentStatus === 'processing') return t('documents.progress.processing', { progress: currentProgress })
    if (currentStatus === 'ready') return t('documents.progress.ready')
    if (currentStatus === 'done') return t('documents.progress.done')
    return t('documents.progress.idle')
  }

  const progressLabel = getProgressLabel(status, progress)

  const normalizeExtension = useCallback((filename: string): DocumentTranslationSupportedExtension | null => {
    const lower = filename.trim().toLowerCase()
    const match = lower.match(/\.([a-z0-9]+)$/)
    const ext = match?.[1]
    if (!ext) return null
    return DOCUMENT_TRANSLATION_SUPPORTED_EXTENSIONS.includes(ext as DocumentTranslationSupportedExtension)
      ? (ext as DocumentTranslationSupportedExtension)
      : null
  }, [])

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  const isCanceledError = (error: unknown) => {
    if (!(error instanceof Error)) return false
    const message = error.message.toLowerCase()
    return message.includes('canceled') || message.includes('cancelled') || message.includes('aborted')
  }

  const translateMutation = useMutation({
    mutationFn: async (params: {
      file: File
      sourceLanguageCode: string
      targetLanguageCode: string
      providerId?: number | null
      signal: AbortSignal
    }) => {
      return documentTranslationService.translate({
        file: params.file,
        sourceLanguageCode: params.sourceLanguageCode,
        targetLanguageCode: params.targetLanguageCode,
        providerId: params.providerId,
        asFile: false,
        signal: params.signal,
        onProgress: setProgress,
      })
    },
    onSuccess: (data) => {
      setResult(data)
      setStatus('done')
      setProgress(100)
      setErrorMessage(null)
      downloadBlob(data.blob, data.translatedFilename)
    },
    onError: (error) => {
      if (isCanceledError(error)) {
        setStatus('idle')
      setProgress(0)
      return
    }
    setStatus('idle')
    setProgress(0)
    setErrorMessage(error instanceof Error ? error.message : t('documents.errors.unknown'))
  },
  })

  const handleTranslate = () => {
    if (!canProcess) {
      setErrorMessage(t('documents.errors.missingSetup'))
      return
    }
    if (!selectedFile) {
      setErrorMessage(t('documents.errors.invalidFile'))
      return
    }

    const extension = normalizeExtension(selectedFile.name)
    if (!extension) {
      setErrorMessage(t('documents.errors.unsupportedFormat', { formats: DOCUMENT_TRANSLATION_FORMATS_LABEL }))
      return
    }

    setOutputFormat(extension)
    setErrorMessage(null)
    setStatus('processing')
    setProgress(0)
    setResult(null)

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    translateMutation.mutate({
      file: selectedFile,
      sourceLanguageCode: sourceLang,
      targetLanguageCode: targetLang,
      providerId: typeof providerId === 'number' ? providerId : undefined,
      signal: controller.signal,
    })
  }

  const handleReset = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    translateMutation.reset()
    setSelectedFile(null)
    setResult(null)
    setStatus('idle')
    setProgress(0)
    setErrorMessage(null)
  }

  const handleCancel = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setStatus('idle')
    setProgress(0)
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.translatedFilename)
  }

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setSelectedFile(null)
      setResult(null)
      setErrorMessage(null)
      setProgress(0)
      setStatus('idle')
      return
    }

    const extension = normalizeExtension(file.name)
    if (!extension) {
      setSelectedFile(null)
      setResult(null)
      setErrorMessage(t('documents.errors.unsupportedFormat', { formats: DOCUMENT_TRANSLATION_FORMATS_LABEL }))
      return
    }

    setSelectedFile(file)
    setResult(null)
    setErrorMessage(null)
    setOutputFormat(extension)
    setProgress(0)
    setStatus('idle')
  }

  const providerOptions =
    providers?.map((prov) => ({
      value: String(prov.id),
      label: prov.isDefault
        ? `${prov.name} · ${prov.providerType}${t('documents.quickConfig.providers.defaultSuffix')}`
        : `${prov.name} · ${prov.providerType}`,
    })) ?? []

  const providerHelperText = useMemo(() => {
    if (isLoadingProviders) return t('documents.quickConfig.providers.loading')
    if (providerOptions.length === 0) return t('documents.quickConfig.providers.none')
    return undefined
  }, [isLoadingProviders, providerOptions.length, t])

  const providersErrorMessage = useMemo(() => {
    if (providersError instanceof Error) return providersError.message
    if (providersError) return t('documents.quickConfig.providers.loadError')
    return null
  }, [providersError, t])

  const outputFormatOptions = useMemo(
    () => OUTPUT_FORMATS.map((value) => ({ value, label: t(`documents.outputFormats.${value}`) })),
    [t],
  )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-10 pt-6">
      <Card padding="lg" className="space-y-3 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
          {t('documents.header.label')}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-bsc-blue-dark dark:text-white">{t('documents.header.title')}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('documents.header.subtitle')}
            </p>
          </div>
         
        </div>
      </Card>

      <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
              {t('documents.quickConfig.label')}
            </p>
            <h2 className="text-2xl font-semibold text-bsc-blue-dark dark:text-white">{t('documents.quickConfig.title')}</h2>
          </div>
         
        </div>
        <div className="grid gap-3 md:grid-cols-2 ">
         
          <Select
            label={t('documents.quickConfig.modelLabel')}
            value={String(providerId)}
            onChange={(event) => setProviderId(Number(event.target.value))}
            options={providerOptions}
            helperText={providerHelperText}
            disabled={status === 'processing' || isLoadingProviders || providerOptions.length === 0} // NOSONAR
          />
          <Select
            label={t('documents.quickConfig.outputFormatLabel')}
            value={outputFormat}
            onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
            options={outputFormatOptions}
            helperText={t('documents.quickConfig.outputFormatHelper')}
            disabled
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 ">

         <LanguageSelector label={t('documents.quickConfig.sourceLanguageLabel')} selectedCode={sourceLang} onChange={setSourceLang} />
          <LanguageSelector
            label={t('documents.quickConfig.targetLanguageLabel')}
            selectedCode={targetLang}
            onChange={setTargetLang}
            excludeCode={sourceLang}
          />
        </div>
      </Card>

      {errorMessage && (
        <Alert variant="danger" title={t('documents.alerts.reviewTitle')} description={errorMessage} className="border border-red-200" />
      )}
      {providersError && (
        <Alert variant="warning" title={t('documents.alerts.providersUnavailableTitle')} description={providersErrorMessage ?? undefined} />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card padding="lg" className="space-y-4 border border-gray-100 dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
                {t('documents.step1.label')}
              </p>
              <h2 className="text-lg font-semibold text-bsc-blue-dark dark:text-white">{t('documents.step1.title')}</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
              <span>{t('documents.step1.formatsLabel', { formats: DOCUMENT_TRANSLATION_FORMATS_LABEL })}</span>
            </div>
          </div>

          <div className="grid gap-4 ">
            <div className="space-y-4">
              <FileUpload onFileSelect={handleFileSelect} accept={DOCUMENT_TRANSLATION_ACCEPT} />
            </div>

          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleReset}>
              {t('documents.step1.reset')}
            </Button>
            {status === 'processing' ? (
              <Button variant="danger" onClick={handleCancel}>
                {t('documents.step1.cancel')}
              </Button>
            ) : (
              <Button variant="primary" onClick={handleTranslate} disabled={!canProcess}>
                {t('documents.step1.translate')}
              </Button>
            )}
            
          </div>
        </Card>

        <div className="space-y-4">
          <Card padding="lg" className="space-y-3 border border-gray-100 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
              {t('documents.step2.label')}
            </p>
            <h2 className="text-lg font-semibold text-bsc-blue-dark dark:text-white">{t('documents.step2.title')}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('documents.step2.subtitle')}
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
                {t('documents.step2.liveProgressHint')}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleDownload} disabled={!result || status === 'processing'}>
              {t('documents.step2.download')}
            </Button>
          </Card>

        </div>
      </div>

      <Card padding="lg" className="space-y-2 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-bsc-blue-dark dark:text-white">{t('documents.integrationNotes.title')}</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>{t('documents.integrationNotes.items.trackingDownload')}</li>
          <li>{t('documents.integrationNotes.items.respectModelLanguages')}</li>
          <li>{t('documents.integrationNotes.items.streamingOrPolling')}</li>
          <li>{t('documents.integrationNotes.items.downloadAfterDone')}</li>
        </ul>
      </Card>
    </div>
  )
}
