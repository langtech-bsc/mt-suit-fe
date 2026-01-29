import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, RefObject, ReactNode } from 'react'
import { Document, Packer, Paragraph } from 'docx'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { LanguageSelector } from '../../../components/LanguageSelector'
import { Alert, Button, Card, Select, Textarea } from '../../../components/ui'
import { useAuthStore } from '../../auth/store/auth.store'
import { useProvidersQuery } from '../../providers/queries/useProvidersQuery'
import type { ProviderRecord } from '../../providers/types'
import { useLanguagesStore } from '../../languages/store/languages.store'
import { useGrammarHoverSelection } from '../hooks/useGrammarHoverSelection'
import {
  requestGrammarCheckDetailed,
  requestPostEditing,
  requestTranslationStream,
  type TranslatorMode,
  type GrammarSuggestion, 
  type PostEditLength,
  type PostEditTone,
} from '../services/translator.service'

const MAX_CHARACTERS = 25_000
const POST_EDIT_TONES: PostEditTone[] = ['conciso', 'formal', 'amigable']
const POST_EDIT_LENGTHS: PostEditLength[] = ['original', 'shorter', 'longer']
const EXPORT_FORMATS = ['txt', 'docx'] as const
type ExportFormat = (typeof EXPORT_FORMATS)[number]

const getModeConfig = (t: TFunction) =>
  ({
    translate: {
      label: t('translator.modes.translate.label'),
      description: t('translator.modes.translate.description'),
      actionLabel: t('translator.modes.translate.actionLabel'),
    },
    grammar: {
      label: t('translator.modes.grammar.label'),
      description: t('translator.modes.grammar.description'),
      actionLabel: t('translator.modes.grammar.actionLabel'),
    },
    'post-editing': {
      label: t('translator.modes.postEditing.label'),
      description: t('translator.modes.postEditing.description'),
      actionLabel: t('translator.modes.postEditing.actionLabel'),
    },
  }) satisfies Record<TranslatorMode, { label: string; description: string; actionLabel: string }>
type StatusState = { variant: 'info' | 'success' | 'warning' | 'danger'; title: string; description: string }
type ProcessingTask = 'translate' | 'grammar' | 'post-edit' | null

const computeCanProcess = (params: {
  mode: TranslatorMode
  inputText: string
  outputText: string
  charError: string | null
}) => {
  if (params.mode === 'post-editing') {
    return params.outputText.trim().length > 0
  }
  return params.inputText.trim().length > 0 && !params.charError
}

const isCanceledError = (error: unknown) => axios.isAxiosError(error) && error.code === 'ERR_CANCELED'

const getProviderHelperText = (t: TFunction, params: { canChangeProvider: boolean; providersError: unknown }) => {
  if (!params.canChangeProvider) {
    return t('translator.modeCard.providerHelper.superuserOnly')
  }
  if (params.providersError) {
    return t('translator.modeCard.providerHelper.loadError')
  }
  return undefined
}

const getFileButtonText = (t: TFunction, uploadedFileName: string | null) => {
  if (!uploadedFileName) {
    return t('translator.panels.input.uploadFile')
  }
  const clipped = uploadedFileName.slice(0, 15)
  return uploadedFileName.length > 15 ? `${clipped}...` : clipped
}

type HighlightRange = { start: number; end: number }
type HighlightSpan = HighlightRange & { id: number }
type HighlightCandidateKey = 'correction' | 'original'

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

const buildErrorDescription = (t: TFunction, error: unknown) => {
  return error instanceof Error ? error.message : t('translator.errors.genericOperation')
}

const buildMissingStatus = (t: TFunction, manualMissingMessage: string): StatusState => ({
  variant: 'warning',
  title: t('translator.status.missingTitle'),
  description: manualMissingMessage,
})

const buildManualProcessingStatus = (t: TFunction, actionLabel: string): StatusState => ({
  variant: 'info',
  title: t('translator.status.processingTitle'),
  description: t('translator.status.processingDescription', { action: actionLabel }),
})

const buildManualSuccessStatus = (t: TFunction, mode: TranslatorMode, activeConfigLabel: string): StatusState => ({
  variant: 'success',
  title: t('translator.status.successTitle'),
  description:
    mode === 'post-editing' ? t('translator.status.successTranslate') : t('translator.status.successGeneric', { label: activeConfigLabel }),
})

const buildManualErrorStatus = (t: TFunction, error: unknown): StatusState => ({
  variant: 'danger',
  title: t('translator.status.errorTitle'),
  description: buildErrorDescription(t, error),
})

const abortOngoingTranslation = (translateAbortRef: RefObject<AbortController | null>) => {
  translateAbortRef.current?.abort()
  translateAbortRef.current = null
}

const resetResultForRun = (params: {
  mode: TranslatorMode
  setTranslationText: (next: string) => void
  setPostEditText: (next: string) => void
  setPostEditTouched: (next: boolean) => void
  setOutputText: (next: string) => void
}) => {
  if (params.mode === 'post-editing') {
    params.setTranslationText('')
    params.setPostEditText('')
    params.setPostEditTouched(false)
    return
  }
  params.setOutputText('')
}

const applyRunResult = (params: {
  mode: TranslatorMode
  result: string
  setTranslationText: (next: string) => void
  setOutputText: (next: string) => void
}) => {
  if (params.mode === 'post-editing') {
    params.setTranslationText(params.result)
    return
  }
  params.setOutputText(params.result)
}

const shouldShowResultOverlay = (params: {
  processingTask: ProcessingTask
  mode: TranslatorMode
  outputText: string
  translationText: string
}) => {
  if (params.processingTask === 'grammar') {
    return params.mode === 'grammar'
  }
  if (params.processingTask !== 'translate') {
    return false
  }
  if (params.mode === 'translate') {
    return params.outputText.trim().length === 0
  }
  if (params.mode === 'post-editing') {
    return params.translationText.trim().length === 0
  }
  return false
}

const resolveHighlightRange = (
  text: string,
  suggestion: GrammarSuggestion,
  candidates: HighlightCandidateKey[],
): HighlightRange | null => {
  const start = suggestion.position
  if (typeof start !== 'number' || start < 0 || start >= text.length) {
    return null
  }

  const directCandidates = candidates.map((candidate) => suggestion[candidate]).filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  )

  for (const candidate of directCandidates) {
    if (text.slice(start, start + candidate.length) === candidate) {
      return { start, end: start + candidate.length }
    }
  }

  for (const candidate of directCandidates) {
    const idx = text.indexOf(candidate, start)
    if (idx !== -1 && idx - start <= 200) {
      return { start: idx, end: idx + candidate.length }
    }
  }

  return null
}

const buildHighlightSpans = (text: string, suggestions: GrammarSuggestion[], candidates: HighlightCandidateKey[]) => {
  const spans: HighlightSpan[] = []
  suggestions.forEach((suggestion, index) => {
    const range = resolveHighlightRange(text, suggestion, candidates)
    if (range && range.end > range.start) {
      spans.push({ id: index, ...range })
    }
  })

  spans.sort((a, b) => a.start - b.start || a.end - b.end)

  const compact: HighlightSpan[] = []
  let cursor = -1
  for (const span of spans) {
    if (span.start < cursor) {
      continue
    }
    compact.push(span)
    cursor = span.end
  }

  return compact
}

const renderHighlightedText = (
  text: string,
  spans: HighlightSpan[],
  hoveredId: number | null,
  setHoveredId: (next: number | null) => void,
  onSpanEnter?: (params: { id: number; element: HTMLElement }) => void,
  onSpanLeave?: () => void,
): ReactNode => {
  if (!spans.length) {
    return text
  }

  const nodes: ReactNode[] = []
  let index = 0
  let spanIndex = 0

  while (index < text.length && spanIndex < spans.length) {
    const span = spans[spanIndex]
    if (span.start > index) {
      nodes.push(text.slice(index, span.start))
    }
    const isHovered = hoveredId === span.id
    nodes.push(
      <button
        key={`hl-${span.id}-${span.start}-${span.end}`}
        type="button"
        className={[
          'inline appearance-none bg-transparent cursor-pointer border-b-2 pb-0.5 text-slate-900 transition-colors dark:text-slate-50',
          'border-emerald-400 hover:border-emerald-500 hover:bg-emerald-100/60 dark:hover:bg-emerald-500/15',
          isHovered ? 'border-emerald-500 bg-emerald-100/60 dark:bg-emerald-500/15' : '',
        ].join(' ')}
        onMouseEnter={(event) => {
          setHoveredId(span.id)
          onSpanEnter?.({ id: span.id, element: event.currentTarget })
        }}
        onMouseLeave={() => {
          setHoveredId(null)
          onSpanLeave?.()
        }}
        onFocus={() => {
          setHoveredId(span.id)
        }}
        onBlur={() => {
          setHoveredId(null)
        }}
        onClick={(event) => {
          onSpanEnter?.({ id: span.id, element: event.currentTarget })
        }}
      >
        {text.slice(span.start, span.end)}
      </button>,
    )
    index = span.end
    spanIndex += 1
  }

  if (index < text.length) {
    nodes.push(text.slice(index))
  }

  return nodes
}

function TranslatorHeader() {
  const { t, i18n } = useTranslation()
  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language
  const numberFormatter = useMemo(() => new Intl.NumberFormat(resolvedLanguage), [resolvedLanguage])
  const maxCharacters = numberFormatter.format(MAX_CHARACTERS)

  return (
    <Card padding="lg" className="space-y-3 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
        {t('translator.header.moduleLabel')}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-bsc-blue-dark dark:text-white">{t('translator.header.title')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('translator.header.subtitle')}
          </p>
        </div>
        <div className="rounded-2xl bg-bsc-blue-medium/10 px-4 py-2 text-sm text-bsc-blue-medium dark:bg-bsc-blue-medium/20 dark:text-bsc-blue-medium-dark">
          {t('translator.header.maxCharacters', { max: maxCharacters })}
        </div>
      </div>
    </Card>
  )
}

function ModeAndLanguageCard(props: Readonly<{
  modeConfig: Record<TranslatorMode, { label: string; description: string; actionLabel: string }>
  activeConfig: { label: string; description: string }
  mode: TranslatorMode
  onModeChange: (nextMode: TranslatorMode) => void
  canChangeProvider: boolean
  isLoadingProviders: boolean
  sortedProviders: ProviderRecord[]
  providerId: number | null
  onProviderChange: (nextId: number) => void
  providerHelperText?: string
  providersError: Error | null
  sourceLang: string
  targetLang: string
  onSourceLangChange: (next: string) => void
  onTargetLangChange: (next: string) => void
  onSwapLanguages: () => void
  providerInputCodes?: string[]
  providerOutputCodes?: string[]
  lockControls: boolean
}>) {
  const { t } = useTranslation()

  return (
    <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.3em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
          {t('translator.modeCard.workModeLabel')}
        </p>
        <h2 className="text-2xl font-semibold text-bsc-blue-dark dark:text-white">{props.activeConfig.label}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">{props.activeConfig.description}</p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        {(Object.keys(props.modeConfig) as TranslatorMode[]).map((item) => {
          const isActive = item === props.mode
          return (
            <button
              key={item}
              type="button"
              onClick={() => props.onModeChange(item)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring ${
                isActive
                  ? 'border-bsc-blue-medium bg-bsc-blue-medium/10 text-bsc-blue-medium dark:border-bsc-blue-medium-dark dark:bg-bsc-blue-medium-dark/10 dark:text-bsc-blue-medium-dark'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {props.modeConfig[item].label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-sm">
          <Select
            label={t('translator.modeCard.modelLabel')}
            helperText={props.providerHelperText}
            value={typeof props.providerId === 'number' ? String(props.providerId) : ''}
            onChange={(event) => props.onProviderChange(Number(event.target.value))}
            disabled={!props.canChangeProvider || props.lockControls || props.isLoadingProviders || props.sortedProviders.length === 0} // NOSONAR
            className="bg-white dark:bg-slate-800 h-8 text-sm py-1!"
          >
            {props.isLoadingProviders && <option value="">{t('translator.modeCard.loadingModels')}</option>}
            {!props.isLoadingProviders && props.sortedProviders.length === 0 && <option value="">{t('translator.modeCard.noModels')}</option>}
            {props.sortedProviders.map((record) => (
              <option key={record.id} value={String(record.id)}>
                {record.name}
                {record.isDefault ? t('translator.modeCard.modelDefaultSuffix') : ''}
              </option>
            ))}
          </Select>
        </div>

        {props.providersError && (
          <div className="w-full sm:w-auto">
            <p className="text-xs text-red-600 dark:text-red-200">{props.providersError.message}</p>
          </div>
        )}
      </div>

      {props.mode === 'grammar' ? (
        <div className="max-w-sm">
          <LanguageSelector
            label={t('translator.modeCard.languageLabel')}
            selectedCode={props.sourceLang}
            onChange={props.onSourceLangChange}
            allowedIsoCodes={props.providerInputCodes}
          />
          <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
            {t('translator.modeCard.grammarHint')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex-1">
            <LanguageSelector
              label={t('translator.modeCard.sourceLanguageLabel')}
              selectedCode={props.sourceLang}
              onChange={props.onSourceLangChange}
              allowedIsoCodes={props.providerInputCodes}
            />
          </div>
          <div className="flex items-center justify-center lg:pt-9">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={t('translator.modeCard.swapLanguagesAria')}
              onClick={props.onSwapLanguages}
              disabled={props.lockControls}
            >
              <SwapIcon />
            </Button>
          </div>
          <div className="flex-1">
            <LanguageSelector
              label={t('translator.modeCard.targetLanguageLabel')}
              selectedCode={props.targetLang}
              onChange={props.onTargetLangChange}
              excludeCode={props.sourceLang}
              allowedIsoCodes={props.providerOutputCodes}
            />
          </div>
        </div>
      )}
    </Card>
  )
}

function TextPanelsSection(props: Readonly<{
  mode: TranslatorMode
  inputText: string
  inputCharacters: number
  inputTextareaRef: RefObject<HTMLTextAreaElement | null>
  lockControls: boolean
  fileButtonText: string
  onTriggerFileDialog: () => void
  onResetInput: () => void
  showCancelButton: boolean
  onCancel: () => void
  onProcess: () => void
  canTranslateInput: boolean
  primaryButtonLabel: string
  onInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  inputHelperText?: string
  charError?: string
  fileError?: string
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileSelection: (event: ChangeEvent<HTMLInputElement>) => void
  exportFormat: ExportFormat
  onExportFormatChange: (next: ExportFormat) => void
  onExport: () => void
  isExportDisabled: boolean
  outputText: string
  translationText: string
  outputTextareaRef: RefObject<HTMLTextAreaElement | null>
  grammarOutputRef: RefObject<HTMLDivElement | null>
  grammarPopover: { id: number; top: number; left: number } | null
  grammarSuggestions: GrammarSuggestion[]
  grammarHighlightSpans: HighlightSpan[]
  hoveredGrammarSuggestionId: number | null
  setHoveredGrammarSuggestionId: (next: number | null) => void
  onGrammarSpanEnter: (params: { id: number; element: HTMLElement }) => void
  onGrammarSpanLeave: () => void
  showResultOverlay: boolean
  grammarHasErrors: boolean
  statusTitle?: string
  onClearResult: () => void
  isClearResultDisabled: boolean
}>) {
  const { t, i18n } = useTranslation()
  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language
  const numberFormatter = useMemo(() => new Intl.NumberFormat(resolvedLanguage), [resolvedLanguage])
  const inputCharacters = numberFormatter.format(props.inputCharacters)
  const maxCharacters = numberFormatter.format(MAX_CHARACTERS)
  const isGrammarMode = props.mode === 'grammar'
  const exportFormatOptions = useMemo(
    () => EXPORT_FORMATS.map((format) => ({ value: format, label: t(`translator.export.formats.${format}`) })),
    [t],
  )

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-bsc-blue-dark dark:text-white">{t('translator.panels.input.title')}</h3>
          </div>
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-300">
            {t('translator.panels.input.counter', { current: inputCharacters, max: maxCharacters })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={props.onTriggerFileDialog} disabled={props.lockControls}>
              {props.fileButtonText}
            </Button>

            <Button type="button" variant="ghost" size="sm" onClick={props.onResetInput} disabled={props.lockControls}>
              {t('translator.panels.input.clearText')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {props.showCancelButton ? (
              <Button type="button" variant="danger" size="sm" onClick={props.onCancel}>
                {t('translator.panels.input.cancel')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={props.onProcess}
                disabled={!props.canTranslateInput || props.lockControls}
              >
                {props.primaryButtonLabel}
              </Button>
            )}
          </div>
        </div>

        <Textarea
          placeholder={t('translator.panels.input.placeholder')}
          rows={14}
          value={props.inputText}
          ref={props.inputTextareaRef}
          onChange={props.onInputChange}
          disabled={props.lockControls}
          className={[
            'bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500',
            isGrammarMode
              ? 'selection:bg-emerald-200/70 selection:text-slate-900 dark:selection:bg-emerald-500/20 dark:selection:text-slate-50'
              : '',
          ].join(' ')}
          helperText={props.inputHelperText}
          error={props.charError}
        />

        {props.fileError && <p className="text-xs text-red-500">{props.fileError}</p>}
        <input ref={props.fileInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={props.onFileSelection} />
      </Card>

      <Card padding="lg" className="relative space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-bsc-blue-dark dark:text-white">
              {props.mode === 'post-editing' ? t('translator.panels.output.titleTranslation') : t('translator.panels.output.titleResult')}
            </h3>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-3">
              <Select
                value={props.exportFormat}
                onChange={(event) => props.onExportFormatChange(event.target.value as ExportFormat)}
                className="min-w-35 bg-white dark:bg-slate-800 h-8 text-sm py-1!"
                options={exportFormatOptions}
              >
              </Select>
              <Button type="button" variant="primary" size="sm" onClick={props.onExport} disabled={props.isExportDisabled}>
                {t('translator.panels.output.export')}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative">
          {isGrammarMode ? (
            <div
              className="min-h-87.5 rounded-lg border border-gray-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
              aria-label={t('translator.panels.output.correctedTextAria')}
            >
              <div ref={props.grammarOutputRef} className="relative whitespace-pre-wrap wrap-break-word">
                {renderHighlightedText(
                  props.outputText,
                  props.grammarHighlightSpans,
                  props.hoveredGrammarSuggestionId,
                  props.setHoveredGrammarSuggestionId,
                  props.onGrammarSpanEnter,
                  props.onGrammarSpanLeave,
                )}
                {props.grammarPopover && props.grammarSuggestions[props.grammarPopover.id] && (
                  <div
                    className="pointer-events-none absolute z-10 w-70 rounded-xl border border-gray-200 bg-white p-3 text-sm text-slate-800 shadow-lg dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    style={{ top: props.grammarPopover.top, left: props.grammarPopover.left }}
                    role="tooltip"
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('translator.panels.output.correctedPosition', {
                        position: props.grammarSuggestions[props.grammarPopover.id].position,
                      })}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold">{t('translator.panels.output.correctedOriginal')}</span>{' '}
                      {props.grammarSuggestions[props.grammarPopover.id].original}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold">{t('translator.panels.output.correctedCorrection')}</span>{' '}
                      {props.grammarSuggestions[props.grammarPopover.id].correction}
                    </p>
                    {props.grammarSuggestions[props.grammarPopover.id].explanation && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        {props.grammarSuggestions[props.grammarPopover.id].explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Textarea
              placeholder={t('translator.panels.output.placeholder')}
              rows={14}
              value={props.mode === 'post-editing' ? props.translationText : props.outputText}
              ref={props.outputTextareaRef}
              readOnly
              className="bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
            />
          )}

          {props.showResultOverlay && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
              <div className="flex items-center gap-3 text-sm font-semibold text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-bsc-blue-medium border-t-transparent" />
                <p>{t('translator.panels.output.processingOverlay')}</p>
              </div>
            </div>
          )}
        </div>

        {isGrammarMode && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {props.grammarHasErrors ? t('translator.panels.output.grammarSuggestionsFound') : t('translator.panels.output.grammarNoErrors')}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          {/* <span>
            Estado: <strong className="font-bold">{props.statusTitle ?? 'Pendiente'}</strong>
          </span> */}
          <Button type="button" variant="ghost" size="sm" onClick={props.onClearResult} disabled={props.isClearResultDisabled}>
            {t('translator.panels.output.clearPanel')}
          </Button>
        </div>
      </Card>
    </section>
  )
}

function PostEditingCard(props: Readonly<{
  postEditTone: PostEditTone
  onPostEditToneChange: (next: PostEditTone) => void
  postEditLength: PostEditLength
  onPostEditLengthChange: (next: PostEditLength) => void
  onPostEdit: () => void
  canPostEditText: boolean
  isProcessing: boolean
  postEditText: string
  onPostEditTextChange: (next: string) => void
  postEditTextareaRef: RefObject<HTMLTextAreaElement | null>
  onResetFromTranslation: () => void
  canResetFromTranslation: boolean
  processingTask: ProcessingTask
}>) {
  const { t } = useTranslation()
  const toneOptions = useMemo(
    () => POST_EDIT_TONES.map((value) => ({ value, label: t(`translator.postEdit.tones.${value}`) })),
    [t],
  )
  const lengthOptions = useMemo(
    () => POST_EDIT_LENGTHS.map((value) => ({ value, label: t(`translator.postEdit.lengths.${value}`) })),
    [t],
  )

  return (
    <Card padding="lg" className="relative space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-bsc-blue-dark dark:text-white">{t('translator.postEdit.title')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('translator.postEdit.description')}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={props.onResetFromTranslation}
          disabled={!props.canResetFromTranslation || props.isProcessing}
        >
          {t('translator.postEdit.resetFromTranslation')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Select
            label={t('translator.postEdit.toneLabel')}
            value={props.postEditTone}
            onChange={(event) => props.onPostEditToneChange(event.target.value as PostEditTone)}
            disabled={props.isProcessing}
            options={toneOptions}
            className="min-w-40 bg-white dark:bg-slate-800 h-8 text-sm py-1!"
          />
          <Select
            label={t('translator.postEdit.lengthLabel')}
            value={props.postEditLength}
            onChange={(event) => props.onPostEditLengthChange(event.target.value as PostEditLength)}
            disabled={props.isProcessing}
            options={lengthOptions}
            className="min-w-40 bg-white dark:bg-slate-800 h-8 text-sm py-1!"
          />
        </div>
        <Button type="button" variant="primary" onClick={props.onPostEdit} disabled={!props.canPostEditText || props.isProcessing}>
          {props.isProcessing ? t('translator.postEdit.buttonProcessing') : t('translator.postEdit.buttonLabel')}
        </Button>
      </div>

      <Textarea
        placeholder={t('translator.postEdit.placeholder')}
        rows={12}
        value={props.postEditText}
        ref={props.postEditTextareaRef}
        onChange={(event) => props.onPostEditTextChange(event.target.value)}
        disabled={props.isProcessing}
        className="bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
      />

      {props.processingTask === 'post-edit' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
          <div className="flex items-center gap-3 text-sm font-semibold text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-bsc-blue-medium border-t-transparent" />
            {t('translator.postEdit.processingOverlay')}
          </div>
        </div>
      )}
    </Card>
  )
}

export const TranslatorView = () => {
  const { t, i18n } = useTranslation()
  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language
  const numberFormatter = useMemo(() => new Intl.NumberFormat(resolvedLanguage), [resolvedLanguage])
  const maxCharacters = useMemo(() => numberFormatter.format(MAX_CHARACTERS), [numberFormatter])

  const user = useAuthStore((state) => state.user)
  const canChangeProvider = Boolean(user?.isSuperuser)
  const { data: providers, isLoading: isLoadingProviders, error: providersError } = useProvidersQuery()
  const languages = useLanguagesStore((state) => state.languages)

  const [mode, setMode] = useState<TranslatorMode>('translate')
  const [sourceLang, setSourceLang] = useState('es')
  const [targetLang, setTargetLang] = useState('en')
  const [inputText, setInputText] = useState('')
  const [translationText, setTranslationText] = useState('')
  const [postEditText, setPostEditText] = useState('')
  const [postEditTouched, setPostEditTouched] = useState(false)
  const [outputText, setOutputText] = useState('')
  const [status, setStatus] = useState<StatusState | null>(null)
  const [charError, setCharError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingTask, setProcessingTask] = useState<ProcessingTask>(null)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [grammarSuggestions, setGrammarSuggestions] = useState<GrammarSuggestion[]>([])
  const [grammarHasErrors, setGrammarHasErrors] = useState(false)
  const [hoveredGrammarSuggestionId, setHoveredGrammarSuggestionId] = useState<number | null>(null)
  const [postEditTone, setPostEditTone] = useState<PostEditTone>('amigable')
  const [postEditLength, setPostEditLength] = useState<PostEditLength>('original')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const inputTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const postEditTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const outputTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const grammarOutputRef = useRef<HTMLDivElement | null>(null)
  const translateAbortRef = useRef<AbortController | null>(null)
  const [providerId, setProviderId] = useState<number | null>(null)
  const [grammarPopover, setGrammarPopover] = useState<{ id: number; top: number; left: number } | null>(null)

  const modeConfig = useMemo(() => getModeConfig(t), [t])
  const activeConfig = useMemo(() => modeConfig[mode], [mode, modeConfig])
  const inputCharacters = inputText.length
  const canTranslateInput = computeCanProcess({ mode: 'translate', inputText, outputText, charError })
  const canPostEditText = postEditText.trim().length > 0
  const exportSourceText = mode === 'post-editing' ? postEditText : outputText
  const isExportDisabled = exportSourceText.trim().length === 0 || isProcessing
  const providerHelperText = getProviderHelperText(t, { canChangeProvider, providersError })
  const selectedProviderId = typeof providerId === 'number' ? providerId : undefined
  const lockControls = isProcessing && mode !== 'translate'
  const isTranslateMode = mode === 'translate'
  const isPostEditingMode = mode === 'post-editing'
  const showCancelButton = isTranslateMode && isProcessing
  const grammarHighlightSpans = useMemo(
    () => buildHighlightSpans(outputText, grammarSuggestions, ['correction', 'original']),
    [grammarSuggestions, outputText],
  )
  const grammarInputHighlightSpans = useMemo(
    () => buildHighlightSpans(inputText, grammarSuggestions, ['original', 'correction']),
    [grammarSuggestions, inputText],
  )
  const inputHelperText = useMemo(() => {
    if (charError) {
      return undefined
    }
    if (mode === 'post-editing') {
      return t('translator.panels.input.helperPostEditing')
    }
    return t('translator.panels.input.helperTranslate')
  }, [charError, mode, t])

  useGrammarHoverSelection({
    mode,
    hoveredId: hoveredGrammarSuggestionId,
    spans: grammarInputHighlightSpans,
    textareaRef: inputTextareaRef,
  })

  const processRunIdRef = useRef(0)
  const translateStreamRunIdRef = useRef(0)

  useEffect(() => {
    setOutputText('')
    setTranslationText('')
    setPostEditText('')
    setPostEditTouched(false)
    setStatus(null)
    setGrammarSuggestions([])
    setGrammarHasErrors(false)
    setHoveredGrammarSuggestionId(null)
    setGrammarPopover(null)
  }, [mode])

  useEffect(() => {
    if (mode !== 'post-editing') {
      return
    }

    if (postEditTouched) {
      return
    }

    setPostEditText(translationText)
  }, [mode, postEditTouched, translationText])


  useEffect(() => {
    return () => {
      translateAbortRef.current?.abort()
      translateAbortRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isProcessing || processingTask !== 'translate') {
      return
    }

    const textarea = outputTextareaRef.current
    if (!textarea) {
      return
    }

    textarea.scrollTop = textarea.scrollHeight
  }, [outputText, translationText, isProcessing, mode, processingTask])

  const handleGrammarSpanEnter = useCallback((params: { id: number; element: HTMLElement }) => {
    const container = grammarOutputRef.current
    if (!container) {
      return
    }
    const containerRect = container.getBoundingClientRect()
    const spanRect = params.element.getBoundingClientRect()
    setGrammarPopover({
      id: params.id,
      top: spanRect.bottom - containerRect.top + 10,
      left: Math.max(12, spanRect.left - containerRect.left),
    })
  }, [])

  const handleGrammarSpanLeave = useCallback(() => {
    setGrammarPopover(null)
  }, [])

  const sortedProviders = useMemo(() => {
    return (providers ?? []).slice().sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  }, [providers])

  const selectedProvider = useMemo(() => {
    if (typeof providerId !== 'number') {
      return null
    }
    return sortedProviders.find((record) => record.id === providerId) ?? null
  }, [providerId, sortedProviders])

  const languageIdToCode = useMemo(() => {
    return new Map(languages.map((lang) => [lang.id, lang.isoCode] as const))
  }, [languages])

  const providerInputCodes = useMemo(() => {
    if (!selectedProvider) {
      return undefined
    }
    const fromObjects = selectedProvider.inputLanguages.map((lang) => lang.code).filter(Boolean)
    if (fromObjects.length > 0) {
      return fromObjects
    }
    const fromIds = selectedProvider.inputLanguageIds
      .map((id) => languageIdToCode.get(id))
      .filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
    return fromIds.length > 0 ? fromIds : undefined
  }, [languageIdToCode, selectedProvider])

  const providerOutputCodes = useMemo(() => {
    if (!selectedProvider) {
      return undefined
    }
    const fromObjects = selectedProvider.outputLanguages.map((lang) => lang.code).filter(Boolean)
    if (fromObjects.length > 0) {
      return fromObjects
    }
    const fromIds = selectedProvider.outputLanguageIds
      .map((id) => languageIdToCode.get(id))
      .filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
    return fromIds.length > 0 ? fromIds : undefined
  }, [languageIdToCode, selectedProvider])

  useEffect(() => {
    if (!providerInputCodes || providerInputCodes.length === 0) {
      return
    }
    if (!providerInputCodes.includes(sourceLang)) {
      setSourceLang(providerInputCodes[0])
    }
  }, [providerInputCodes, sourceLang])

  useEffect(() => {
    if (!providerOutputCodes || providerOutputCodes.length === 0) {
      return
    }

    const isValid = providerOutputCodes.includes(targetLang)
    if (isValid && targetLang !== sourceLang) {
      return
    }

    const candidate = providerOutputCodes.find((code) => code !== sourceLang) ?? providerOutputCodes[0]
    if (candidate && candidate !== targetLang) {
      setTargetLang(candidate)
    }
  }, [providerOutputCodes, sourceLang, targetLang])

  useEffect(() => {
    if (providerId !== null) {
      return
    }
    if (!sortedProviders || sortedProviders.length === 0) {
      return
    }

    const defaultProvider = sortedProviders.find((record) => record.isDefault)
    setProviderId(defaultProvider?.id ?? sortedProviders[0].id)
  }, [providerId, sortedProviders])

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
      setCharError(t('translator.errors.charLimitReached', { max: maxCharacters }))
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
      setFileError(t('translator.errors.unsupportedFileFormat'))
      return
    }

    try {
      const text = await file.text()
      if (text.length > MAX_CHARACTERS) {
        setCharError(t('translator.errors.fileCharLimit', { max: maxCharacters }))
      } else {
        setCharError(null)
      }
      setInputText(text.slice(0, MAX_CHARACTERS))
      setUploadedFileName(file.name)
      setFileError(null)
    } catch (error) {
      console.error(error)
      setFileError(t('translator.errors.readFileFailed'))
    }
  }

  const triggerFileDialog = () => {
    fileInputRef.current?.click()
  }

  const performTranslate = useCallback(async () => {
    const abortController = new AbortController()
    translateAbortRef.current = abortController
    const streamRunId = translateStreamRunIdRef.current

    return requestTranslationStream(
      {
        text: inputText.trim(),
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        providerId: selectedProviderId,
      },
      (_delta, fullText) => {
        if (translateStreamRunIdRef.current !== streamRunId) {
          return
        }
        if (mode === 'post-editing') {
          setTranslationText(fullText)
        } else {
          setOutputText(fullText)
        }
      },
      { signal: abortController.signal },
    )
  }, [inputText, mode, selectedProviderId, sourceLang, targetLang])

  const performGrammar = useCallback(async () => {
    const payload = await requestGrammarCheckDetailed({
      text: inputText.trim(),
      language: sourceLang,
      providerId: selectedProviderId,
    })
    setGrammarSuggestions(payload.suggestions)
    setGrammarHasErrors(payload.hasErrors)
    return payload.correctedText
  }, [inputText, selectedProviderId, sourceLang])

  const performPostEdit = useCallback(
    async (text: string) => {
      return requestPostEditing({
        text,
        language: targetLang,
        providerId: selectedProviderId,
        tone: postEditTone,
        length: postEditLength,
      })
    },
    [postEditLength, postEditTone, selectedProviderId, targetLang],
  )

  const manualMissingMessage = useMemo(() => {
    return mode === 'post-editing' ? t('translator.status.missingInputPostEditing') : t('translator.status.missingInputGeneric')
  }, [mode, t])

  const modeRunner = useMemo(() => {
    return {
      translate: performTranslate,
      grammar: performGrammar,
      'post-editing': performTranslate,
    } satisfies Record<TranslatorMode, () => Promise<string>>
  }, [performGrammar, performTranslate])

  const runProcess = useCallback(async () => {
    if (!canTranslateInput) {
      setStatus(buildMissingStatus(t, manualMissingMessage))
      return
    }

    const runId = processRunIdRef.current + 1
    processRunIdRef.current = runId

    const isTranslateLikeMode = mode !== 'grammar'
    if (isTranslateLikeMode) translateStreamRunIdRef.current = runId

    if (isTranslateLikeMode) abortOngoingTranslation(translateAbortRef)

    setIsProcessing(true)
    setProcessingTask(mode === 'grammar' ? 'grammar' : 'translate')
    if (isTranslateLikeMode) {
      resetResultForRun({
        mode,
        setTranslationText,
        setPostEditText,
        setPostEditTouched,
        setOutputText,
      })
    }
    setStatus(buildManualProcessingStatus(t, activeConfig.actionLabel))

    try {
      const run = modeRunner[mode]
      const result = await run()

      if (processRunIdRef.current !== runId) {
        return
      }
      applyRunResult({ mode, result, setTranslationText, setOutputText })
      setStatus(buildManualSuccessStatus(t, mode, activeConfig.label))
    } catch (error) {
      if (isCanceledError(error)) {
        return
      }
      if (processRunIdRef.current !== runId) {
        return
      }
      setStatus(buildManualErrorStatus(t, error))
    } finally {
      if (processRunIdRef.current === runId) {
        translateAbortRef.current = null
        setIsProcessing(false)
        setProcessingTask(null)
      }
    }
  }, [activeConfig.actionLabel, activeConfig.label, canTranslateInput, manualMissingMessage, mode, modeRunner, t])

  const handleProcess = async () => {
    await runProcess()
  }

  const handlePostEdit = useCallback(async () => {
    if (isProcessing) {
      return
    }

    if (!canPostEditText) {
      setStatus({
        variant: 'warning',
        title: t('translator.postEdit.missing.title'),
        description: t('translator.postEdit.missing.description'),
      })
      return
    }

    setIsProcessing(true)
    setProcessingTask('post-edit')
    setStatus({
      variant: 'info',
      title: t('translator.postEdit.status.improvingTitle'),
      description: t('translator.postEdit.status.improvingDescription'),
    })

    try {
      const sourceText = postEditText.trim()
      const result = await performPostEdit(sourceText)
      setPostEditText(result)
      setPostEditTouched(true)
      setStatus({
        variant: 'success',
        title: t('translator.status.successTitle'),
        description: t('translator.postEdit.success.description'),
      })
    } catch (error) {
      if (isCanceledError(error)) {
        return
      }
      const description = buildErrorDescription(t, error)
      setStatus({
        variant: 'danger',
        title: t('translator.status.errorTitle'),
        description,
      })
    } finally {
      setIsProcessing(false)
      setProcessingTask(null)
    }
  }, [canPostEditText, isProcessing, performPostEdit, postEditText, t])

  // Traducción solo manual (click en "Traducir"): no auto-ejecución al escribir.

  const handleExport = async () => {
    if (isExportDisabled) return
    const exportSource = mode === 'post-editing' ? postEditText : outputText
    const text = exportSource.trim()
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

  const handleClearResult = () => {
    if (mode === 'post-editing') {
      setTranslationText('')
      setPostEditText('')
      setPostEditTouched(false)
      return
    }
    setOutputText('')
  }

  const handleCancelTranslation = () => {
    abortOngoingTranslation(translateAbortRef)
    setIsProcessing(false)
    setProcessingTask(null)
    setStatus({
      variant: 'warning',
      title: t('translator.status.canceledTitle'),
      description: t('translator.status.canceledDescription'),
    })
  }

  const fileButtonText = getFileButtonText(t, uploadedFileName)
  const isClearResultDisabled = isPostEditingMode ? (!translationText && !postEditText) || isProcessing : !outputText || isProcessing
  const showResultOverlay = shouldShowResultOverlay({ processingTask, mode, outputText, translationText })
  const statusTitle = status?.title

  const handleProviderChange = (nextProviderId: number) => {
    if (!Number.isFinite(nextProviderId)) return
    setProviderId(nextProviderId)
  }

  const handleExportFormatChange = (next: ExportFormat) => {
    setExportFormat(next)
  }

  const handleResetFromTranslation = () => {
    setPostEditText(translationText)
    setPostEditTouched(false)
  }

  const handlePostEditTextChange = (next: string) => {
    setPostEditText(next)
    setPostEditTouched(true)
  }

  return (
    <div className="flex min-h-screen flex-col  px-4 py-8 text-slate-900  dark:text-slate-50 sm:px-6 lg:px-10">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
        <TranslatorHeader />

        <ModeAndLanguageCard
          modeConfig={modeConfig}
          activeConfig={activeConfig}
          mode={mode}
          onModeChange={handleModeChange}
          canChangeProvider={canChangeProvider}
          isLoadingProviders={isLoadingProviders}
          sortedProviders={sortedProviders}
          providerId={providerId}
          onProviderChange={handleProviderChange}
          providerHelperText={providerHelperText}
          providersError={providersError}
          sourceLang={sourceLang}
          targetLang={targetLang}
          onSourceLangChange={setSourceLang}
          onTargetLangChange={setTargetLang}
          onSwapLanguages={handleSwapLanguages}
          providerInputCodes={providerInputCodes}
          providerOutputCodes={providerOutputCodes}
          lockControls={lockControls}
        />

        {status && <Alert variant={status.variant} title={status.title} description={status.description} className="shadow-sm" />}

        <TextPanelsSection
          mode={mode}
          inputText={inputText}
          inputCharacters={inputCharacters}
          inputTextareaRef={inputTextareaRef}
          lockControls={lockControls}
          fileButtonText={fileButtonText}
          onTriggerFileDialog={triggerFileDialog}
          onResetInput={resetInput}
          showCancelButton={showCancelButton}
          onCancel={handleCancelTranslation}
          onProcess={handleProcess}
          canTranslateInput={canTranslateInput}
          primaryButtonLabel={isProcessing ? `${t('translator.status.processingTitle')}…` : activeConfig.actionLabel}
          onInputChange={handleInputChange}
          inputHelperText={inputHelperText}
          charError={charError ?? undefined}
          fileError={fileError ?? undefined}
          fileInputRef={fileInputRef}
          onFileSelection={handleFileSelection}
          exportFormat={exportFormat}
          onExportFormatChange={handleExportFormatChange}
          onExport={handleExport}
          isExportDisabled={isExportDisabled}
          outputText={outputText}
          translationText={translationText}
          outputTextareaRef={outputTextareaRef}
          grammarOutputRef={grammarOutputRef}
          grammarPopover={grammarPopover}
          grammarSuggestions={grammarSuggestions}
          grammarHighlightSpans={grammarHighlightSpans}
          hoveredGrammarSuggestionId={hoveredGrammarSuggestionId}
          setHoveredGrammarSuggestionId={setHoveredGrammarSuggestionId}
          onGrammarSpanEnter={handleGrammarSpanEnter}
          onGrammarSpanLeave={handleGrammarSpanLeave}
          showResultOverlay={showResultOverlay}
          grammarHasErrors={grammarHasErrors}
          statusTitle={statusTitle}
          onClearResult={handleClearResult}
          isClearResultDisabled={isClearResultDisabled}
        />

        {isPostEditingMode && (
          <PostEditingCard
            postEditTone={postEditTone}
            onPostEditToneChange={setPostEditTone}
            postEditLength={postEditLength}
            onPostEditLengthChange={setPostEditLength}
            onPostEdit={handlePostEdit}
            canPostEditText={canPostEditText}
            isProcessing={isProcessing}
            postEditText={postEditText}
            onPostEditTextChange={handlePostEditTextChange}
            postEditTextareaRef={postEditTextareaRef}
            onResetFromTranslation={handleResetFromTranslation}
            canResetFromTranslation={Boolean(translationText)}
            processingTask={processingTask}
          />
        )}

        <Card padding="lg" className="flex flex-col gap-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Alert
            variant="neutral"
            title={t('translator.tips.title')}
            description={t('translator.tips.description')}
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
