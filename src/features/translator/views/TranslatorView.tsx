import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, RefObject, ReactNode } from 'react'
import { Document, Packer, Paragraph } from 'docx'
import axios from 'axios'
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
const AUTO_TRANSLATE_DEBOUNCE_MS = 400
const POST_EDITING_BUTTON_LABEL = 'Mejorar traducción'
const POST_EDIT_TONES: Array<{ value: PostEditTone; label: string }> = [
  { value: 'conciso', label: 'Conciso' },
  { value: 'formal', label: 'Formal' },
  { value: 'amigable', label: 'Amigable' },
]
const POST_EDIT_LENGTHS: Array<{ value: PostEditLength; label: string }> = [
  { value: 'original', label: 'Mantener' },
  { value: 'shorter', label: 'Más corto' },
  { value: 'longer', label: 'Más largo' },
]
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
    description: 'Traduce y luego aplica Post-Editing sobre el panel de traducción para mejorar estilo y fluidez.',
    actionLabel: 'Traducir',
  },
}

type ExportFormat = (typeof EXPORT_FORMATS)[number]['value']
type StatusState = { variant: 'info' | 'success' | 'warning' | 'danger'; title: string; description: string }
type ProcessingTask = 'translate' | 'grammar' | 'post-edit' | null

const buildMissingContentMessage = (mode: TranslatorMode) =>
  mode === 'post-editing'
    ? 'Pega o genera una traducción en el panel derecho antes de mejorarla.'
    : 'Escribe o carga al menos un carácter en el panel izquierdo para continuar.'

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

const getProviderHelperText = (params: { canChangeProvider: boolean; providersError: unknown }) => {
  if (!params.canChangeProvider) {
    return 'Solo superusers pueden cambiarlo.'
  }
  if (params.providersError) {
    return 'No pudimos cargar modelos.'
  }
  return undefined
}

const getFileButtonText = (uploadedFileName: string | null) => {
  if (!uploadedFileName) {
    return 'Subir archivo'
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

const buildErrorDescription = (error: unknown) => {
  return error instanceof Error ? error.message : 'No pudimos completar la operación.'
}

const buildMissingStatus = (manualMissingMessage: string): StatusState => ({
  variant: 'warning',
  title: 'Falta contenido',
  description: manualMissingMessage,
})

const buildManualProcessingStatus = (actionLabel: string): StatusState => ({
  variant: 'info',
  title: 'Procesando',
  description: `${actionLabel} en curso. Esto puede tardar unos segundos?`,
})

const buildManualSuccessStatus = (mode: TranslatorMode, activeConfigLabel: string): StatusState => ({
  variant: 'success',
  title: 'Listo',
  description: mode === 'post-editing' ? 'Traducción completada correctamente.' : `${activeConfigLabel} completado correctamente.`,
})

const buildManualErrorStatus = (error: unknown): StatusState => ({
  variant: 'danger',
  title: 'Error en la solicitud',
  description: buildErrorDescription(error),
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
  return (
    <Card padding="lg" className="space-y-3 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
        Módulo avanzado
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-bsc-blue-dark dark:text-white">Traductor inteligente BSC</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Traducción estándar, corrección gramatical y postedición integrados en un solo flujo.
          </p>
        </div>
        <div className="rounded-2xl bg-bsc-blue-medium/10 px-4 py-2 text-sm text-bsc-blue-medium dark:bg-bsc-blue-medium/20 dark:text-bsc-blue-medium-dark">
          Máximo {MAX_CHARACTERS.toLocaleString('es-ES')} caracteres
        </div>
      </div>
    </Card>
  )
}

function ModeAndLanguageCard(props: Readonly<{
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
  return (
    <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.3em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">Modo de trabajo</p>
        <h2 className="text-2xl font-semibold text-bsc-blue-dark dark:text-white">{props.activeConfig.label}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">{props.activeConfig.description}</p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        {(Object.keys(MODE_CONFIG) as TranslatorMode[]).map((item) => {
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
              {MODE_CONFIG[item].label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-sm">
          <Select
            label="Modelo"
            helperText={props.providerHelperText}
            value={typeof props.providerId === 'number' ? String(props.providerId) : ''}
            onChange={(event) => props.onProviderChange(Number(event.target.value))}
            disabled={!props.canChangeProvider || props.lockControls || props.isLoadingProviders || props.sortedProviders.length === 0} // NOSONAR
            className="bg-white dark:bg-slate-800 h-8 text-sm py-1!"
          >
            {props.isLoadingProviders && <option value="">Cargando modelos…</option>}
            {!props.isLoadingProviders && props.sortedProviders.length === 0 && <option value="">Sin modelos disponibles</option>}
            {props.sortedProviders.map((record) => (
              <option key={record.id} value={String(record.id)}>
                {record.name}
                {record.isDefault ? ' (default)' : ''}
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
            label="Idioma"
            selectedCode={props.sourceLang}
            onChange={props.onSourceLangChange}
            allowedIsoCodes={props.providerInputCodes}
          />
          <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
            El modo Grammar Checker analiza gramática y ortografía en este idioma.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex-1">
            <LanguageSelector
              label="Idioma origen"
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
              aria-label="Intercambiar idiomas"
              onClick={props.onSwapLanguages}
              disabled={props.lockControls}
            >
              <SwapIcon />
            </Button>
          </div>
          <div className="flex-1">
            <LanguageSelector
              label="Idioma destino"
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
  const isGrammarMode = props.mode === 'grammar'

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-bsc-blue-dark dark:text-white">Texto origen</h3>
          </div>
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-300">
            {props.inputCharacters.toLocaleString('es-ES')} / {MAX_CHARACTERS.toLocaleString('es-ES')}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={props.onTriggerFileDialog} disabled={props.lockControls}>
              {props.fileButtonText}
            </Button>

            <Button type="button" variant="ghost" size="sm" onClick={props.onResetInput} disabled={props.lockControls}>
              Limpiar texto
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {props.showCancelButton ? (
              <Button type="button" variant="danger" size="sm" onClick={props.onCancel}>
                Cancelar
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
          placeholder="Escribe, pega o importa tu texto aquí?"
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
              {props.mode === 'post-editing' ? 'Traducción' : 'Resultado'}
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
              >
                {EXPORT_FORMATS.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="primary" size="sm" onClick={props.onExport} disabled={props.isExportDisabled}>
                Exportar
              </Button>
            </div>
          </div>
        </div>

        <div className="relative">
          {isGrammarMode ? (
            <div
              className="min-h-87.5 rounded-lg border border-gray-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
              aria-label="Texto corregido"
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
                      Posición: {props.grammarSuggestions[props.grammarPopover.id].position}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold">Original:</span> {props.grammarSuggestions[props.grammarPopover.id].original}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold">Corrección:</span> {props.grammarSuggestions[props.grammarPopover.id].correction}
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
              placeholder="Aquí verás la traducción, corrección gramatical o postedición."
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
                <p>Procesando solicitud</p>
              </div>
            </div>
          )}
        </div>

        {isGrammarMode && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {props.grammarHasErrors
              ? 'Se detectaron sugerencias. Pasa el mouse por el texto subrayado para ver detalles.'
              : 'No se detectaron errores.'}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          {/* <span>
            Estado: <strong className="font-bold">{props.statusTitle ?? 'Pendiente'}</strong>
          </span> */}
          <Button type="button" variant="ghost" size="sm" onClick={props.onClearResult} disabled={props.isClearResultDisabled}>
            Vaciar panel
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
  return (
    <Card padding="lg" className="relative space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-bsc-blue-dark dark:text-white">Post-Editing</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Edita la traducción y aplica mejoras de estilo, tono y longitud. El resultado se guarda en esta misma caja.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={props.onResetFromTranslation}
          disabled={!props.canResetFromTranslation || props.isProcessing}
        >
          Restablecer desde traducción
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Select
            label="Tono"
            value={props.postEditTone}
            onChange={(event) => props.onPostEditToneChange(event.target.value as PostEditTone)}
            disabled={props.isProcessing}
            options={POST_EDIT_TONES}
            className="min-w-40 bg-white dark:bg-slate-800 h-8 text-sm py-1!"
          />
          <Select
            label="Longitud"
            value={props.postEditLength}
            onChange={(event) => props.onPostEditLengthChange(event.target.value as PostEditLength)}
            disabled={props.isProcessing}
            options={POST_EDIT_LENGTHS}
            className="min-w-40 bg-white dark:bg-slate-800 h-8 text-sm py-1!"
          />
        </div>
        <Button type="button" variant="primary" onClick={props.onPostEdit} disabled={!props.canPostEditText || props.isProcessing}>
          {props.isProcessing ? 'Procesando?' : POST_EDITING_BUTTON_LABEL}
        </Button>
      </div>

      <Textarea
        placeholder="Aquí se editará el texto sobre el que aplicar Post-Editing?"
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
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-bsc-blue-medium border-t-transparent" />Procesando solicitud?
          </div>
        </div>
      )}
    </Card>
  )
}

export const TranslatorView = () => {
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

  const activeConfig = useMemo(() => MODE_CONFIG[mode], [mode])
  const inputCharacters = inputText.length
  const canTranslateInput = computeCanProcess({ mode: 'translate', inputText, outputText, charError })
  const canPostEditText = postEditText.trim().length > 0
  const exportSourceText = mode === 'post-editing' ? postEditText : outputText
  const isExportDisabled = exportSourceText.trim().length === 0 || isProcessing
  const providerHelperText = getProviderHelperText({ canChangeProvider, providersError })
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
      return 'Traduce desde este panel. La traducción aparecerá a la derecha y podrás mejorarla abajo con Post-Editing.'
    }
    return 'Este texto alimenta los modos Translate y Grammar Checker.'
  }, [charError, mode])

  useGrammarHoverSelection({
    mode,
    hoveredId: hoveredGrammarSuggestionId,
    spans: grammarInputHighlightSpans,
    textareaRef: inputTextareaRef,
  })

  const runProcessRef = useRef<((origin: 'manual' | 'auto') => Promise<void>) | null>(null)

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

  const performTranslate = useCallback(async () => {
    const abortController = new AbortController()
    translateAbortRef.current = abortController

    return requestTranslationStream(
      {
        text: inputText.trim(),
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        providerId: selectedProviderId,
      },
      (_delta, fullText) => {
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
    return mode === 'post-editing'
      ? 'Escribe o carga un texto en el panel izquierdo para traducir.'
      : buildMissingContentMessage(mode)
  }, [mode])

  const modeRunner = useMemo(() => {
    return {
      translate: performTranslate,
      grammar: performGrammar,
      'post-editing': performTranslate,
    } satisfies Record<TranslatorMode, () => Promise<string>>
  }, [performGrammar, performTranslate])

  const runProcess = useCallback(async (origin: 'manual' | 'auto') => {
    const isManual = origin === 'manual'

    if (!canTranslateInput) {
      if (isManual) setStatus(buildMissingStatus(manualMissingMessage))
      return
    }

    const isTranslateLikeMode = mode !== 'grammar'

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
    if (isManual) setStatus(buildManualProcessingStatus(activeConfig.actionLabel))

    try {
      const run = modeRunner[mode]
      const result = await run()

      applyRunResult({ mode, result, setTranslationText, setOutputText })
      if (isManual) setStatus(buildManualSuccessStatus(mode, activeConfig.label))
    } catch (error) {
      if (isCanceledError(error)) {
        return
      }
      setStatus(buildManualErrorStatus(error))
    } finally {
      translateAbortRef.current = null
      setIsProcessing(false)
      setProcessingTask(null)
    }
  }, [activeConfig.actionLabel, activeConfig.label, canTranslateInput, manualMissingMessage, mode, modeRunner])

  useEffect(() => {
    runProcessRef.current = runProcess
  }, [runProcess])

  const handleProcess = async () => {
    await runProcess('manual')
  }

  const handlePostEdit = useCallback(async () => {
    if (isProcessing) {
      return
    }

    if (!canPostEditText) {
      setStatus({
        variant: 'warning',
        title: 'Falta contenido',
        description: 'Primero traduce o pega un texto en el editor de Post-Editing para aplicar mejoras.',
      })
      return
    }

    setIsProcessing(true)
    setProcessingTask('post-edit')
    setStatus({
      variant: 'info',
      title: 'Mejorando traducción',
      description: 'Aplicando mejoras de estilo y fluidez…',
    })

    try {
      const sourceText = postEditText.trim()
      const result = await performPostEdit(sourceText)
      setPostEditText(result)
      setPostEditTouched(true)
      setStatus({
        variant: 'success',
        title: 'Listo',
        description: 'Post-Editing completado correctamente.',
      })
    } catch (error) {
      if (isCanceledError(error)) {
        return
      }
      const description = error instanceof Error ? error.message : 'No pudimos completar la operación.'
      setStatus({
        variant: 'danger',
        title: 'Error en la solicitud',
        description,
      })
    } finally {
      setIsProcessing(false)
      setProcessingTask(null)
    }
  }, [canPostEditText, isProcessing, performPostEdit, postEditText])

  useEffect(() => {
    if (mode !== 'translate') {
      return
    }

    if (charError) {
      return
    }

    const trimmed = inputText.trim()
    if (!trimmed) {
      setOutputText('')
      return
    }

    if (providerId === null) {
      return
    }

    translateAbortRef.current?.abort()
    translateAbortRef.current = null

    const timeoutId = window.setTimeout(() => {
     runProcessRef.current?.('auto')
    }, AUTO_TRANSLATE_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [inputText, sourceLang, targetLang, providerId, mode, charError])

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
      title: 'Cancelado',
      description: 'La traducción en curso fue cancelada.',
    })
  }

  const fileButtonText = getFileButtonText(uploadedFileName)
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
          primaryButtonLabel={isProcessing ? 'Procesando…' : activeConfig.actionLabel}
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
