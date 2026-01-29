import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../../components/LanguageSelector'
import { FileUpload } from '../../../components/FileUpload'
import { Alert, Button, Card, Select } from '../../../components/ui'
import { useProvidersQuery } from '../../providers/queries/useProvidersQuery'
import { useLanguagesStore } from '../../languages/store/languages.store'
import {
  DOCUMENT_TRANSLATION_ACCEPT,
  DOCUMENT_TRANSLATION_FORMATS_LABEL,
  DOCUMENT_TRANSLATION_SUPPORTED_EXTENSIONS,
  type DocumentTranslationSupportedExtension,
} from '../../../constants/fileTypes'

export function DocumentTranslatorView() {
  const { t } = useTranslation()
  const { data: providers, isLoading: isLoadingProviders, error: providersError } = useProvidersQuery()
  const languages = useLanguagesStore((state) => state.languages)

  const [sourceLang, setSourceLang] = useState('')
  const [targetLang, setTargetLang] = useState('')
  const [providerId, setProviderId] = useState<number | ''>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPendingImplementationAlert, setIsPendingImplementationAlert] = useState(false)

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

  const normalizeExtension = useCallback((filename: string): DocumentTranslationSupportedExtension | null => {
    const lower = filename.trim().toLowerCase()
    const match = lower.match(/\.([a-z0-9]+)$/)
    const ext = match?.[1]
    if (!ext) return null
    return DOCUMENT_TRANSLATION_SUPPORTED_EXTENSIONS.includes(ext as DocumentTranslationSupportedExtension)
      ? (ext as DocumentTranslationSupportedExtension)
      : null
  }, [])

  const handleTranslate = () => {
    if (!canProcess) {
      setErrorMessage(t('documents.errors.missingSetup'))
      setIsPendingImplementationAlert(false)
      return
    }
    if (!selectedFile) {
      setErrorMessage(t('documents.errors.invalidFile'))
      setIsPendingImplementationAlert(false)
      return
    }

    const extension = normalizeExtension(selectedFile.name)
    if (!extension) {
      setErrorMessage(t('documents.errors.unsupportedFormat', { formats: DOCUMENT_TRANSLATION_FORMATS_LABEL }))
      setIsPendingImplementationAlert(false)
      return
    }

    setErrorMessage(t('documents.alerts.pendingImplementationDescription'))
    setIsPendingImplementationAlert(true)
  }

  const handleReset = () => {
    setSelectedFile(null)
    setErrorMessage(null)
    setIsPendingImplementationAlert(false)
  }

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setSelectedFile(null)
      setErrorMessage(null)
      setIsPendingImplementationAlert(false)
      return
    }

    const extension = normalizeExtension(file.name)
    if (!extension) {
      setSelectedFile(null)
      setErrorMessage(t('documents.errors.unsupportedFormat', { formats: DOCUMENT_TRANSLATION_FORMATS_LABEL }))
      setIsPendingImplementationAlert(false)
      return
    }

    setSelectedFile(file)
    setErrorMessage(null)
    setIsPendingImplementationAlert(false)
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

  const alertVariant = isPendingImplementationAlert ? 'info' : 'danger'
  const alertTitle = isPendingImplementationAlert ? t('documents.alerts.pendingImplementationTitle') : t('documents.alerts.reviewTitle')

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
            disabled={isLoadingProviders || providerOptions.length === 0} // NOSONAR
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
        <Alert variant={alertVariant} title={alertTitle} description={errorMessage} />
      )}
      {providersError && (
        <Alert variant="warning" title={t('documents.alerts.providersUnavailableTitle')} description={providersErrorMessage ?? undefined} />
      )}

      <div className="grid gap-5">
        <Card padding="lg" className="space-y-4 border border-gray-100 dark:border-slate-800 dark:bg-slate-900/60">
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
            <Button variant="primary" onClick={handleTranslate} disabled={!canProcess}>
              {t('documents.step1.translate')}
            </Button>
            
          </div>
        </Card>
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
