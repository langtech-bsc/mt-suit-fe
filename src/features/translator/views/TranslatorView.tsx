import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Document, Packer, Paragraph } from 'docx'
import axios from 'axios'
import { LanguageSelector } from '../../../components/LanguageSelector'
import { Alert, Button, Card, Select, Textarea } from '../../../components/ui'
import { useAuthStore } from '../../auth/store/auth.store'
import { useProvidersQuery } from '../../providers/queries/useProvidersQuery'
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
    description: 'Refina la traducción pegada en el panel derecho para mejorar estilo y fluidez.',
    actionLabel: 'Traducir',
  },
}

type ExportFormat = (typeof EXPORT_FORMATS)[number]['value']
type StatusState = { variant: 'info' | 'success' | 'warning' | 'danger'; title: string; description: string }

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

export const TranslatorView = () => {
  const user = useAuthStore((state) => state.user)
  const canChangeProvider = Boolean(user?.isSuperuser)
  const { data: providers, isLoading: isLoadingProviders, error: providersError } = useProvidersQuery()
  const languages = useLanguagesStore((state) => state.languages)

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
  const [grammarSuggestions, setGrammarSuggestions] = useState<GrammarSuggestion[]>([])
  const [grammarHasErrors, setGrammarHasErrors] = useState(false)
  const [hoveredGrammarSuggestionId, setHoveredGrammarSuggestionId] = useState<number | null>(null)
  const [postEditTone, setPostEditTone] = useState<PostEditTone>('amigable')
  const [postEditLength, setPostEditLength] = useState<PostEditLength>('original')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const inputTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const outputTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const grammarOutputRef = useRef<HTMLDivElement | null>(null)
  const translateAbortRef = useRef<AbortController | null>(null)
  const [providerId, setProviderId] = useState<number | null>(null)
  const [grammarPopover, setGrammarPopover] = useState<{ id: number; top: number; left: number } | null>(null)

  const activeConfig = useMemo(() => MODE_CONFIG[mode], [mode])
  const inputCharacters = inputText.length
  const canTranslateInput = computeCanProcess({ mode: 'translate', inputText, outputText, charError })
  const canPostEditOutput = outputText.trim().length > 0
  const isExportDisabled = outputText.trim().length === 0 || isProcessing
  const providerHelperText = getProviderHelperText({ canChangeProvider, providersError })
  const selectedProviderId = typeof providerId === 'number' ? providerId : undefined
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
      return 'Puedes seguir traduciendo desde este panel; el Post-Editing se aplica sobre el texto del panel derecho.'
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
    setStatus(null)
    setGrammarSuggestions([])
    setGrammarHasErrors(false)
    setHoveredGrammarSuggestionId(null)
    setGrammarPopover(null)
  }, [mode])



  useEffect(() => {
    return () => {
      translateAbortRef.current?.abort()
      translateAbortRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isProcessing || mode !== 'translate') {
      return
    }

    const textarea = outputTextareaRef.current
    if (!textarea) {
      return
    }

    textarea.scrollTop = textarea.scrollHeight
  }, [outputText, isProcessing, mode])

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
        setOutputText(fullText)
      },
      { signal: abortController.signal },
    )
  }, [inputText, selectedProviderId, sourceLang, targetLang])

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
      if (isManual) {
        setStatus({
          variant: 'warning',
          title: 'Falta contenido',
          description: manualMissingMessage,
        })
      }
      return
    }

    const isTranslateLikeMode = mode !== 'grammar'

    if (isTranslateLikeMode) {
      translateAbortRef.current?.abort()
      translateAbortRef.current = null
    }

    setIsProcessing(true)
    if (isTranslateLikeMode) {
      setOutputText('')
    }
    if (isManual) {
      setStatus({
        variant: 'info',
        title: 'Procesando',
        description: `${activeConfig.actionLabel} en curso. Esto puede tardar unos segundos…`,
      })
    }

    try {
      const run = modeRunner[mode]
      const result = await run()

      setOutputText(result)
      if (isManual) {
        setStatus({
          variant: 'success',
          title: 'Listo',
          description: `${activeConfig.label} completado correctamente.`,
        })
      }
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
      translateAbortRef.current = null
      setIsProcessing(false)
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

    if (!canPostEditOutput) {
      setStatus({
        variant: 'warning',
        title: 'Falta contenido',
        description: 'Primero traduce o pega un texto en el panel derecho para aplicar Post-Editing.',
      })
      return
    }

    setIsProcessing(true)
    setStatus({
      variant: 'info',
      title: 'Mejorando traducción',
      description: 'Aplicando mejoras de estilo y fluidez…',
    })

    try {
      const sourceText = outputText.trim()
      const result = await performPostEdit(sourceText)
      setOutputText(result)
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
    }
  }, [canPostEditOutput, isProcessing, outputText, performPostEdit])

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

  const fileButtonText = getFileButtonText(uploadedFileName)

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-white via-blue-50/40 to-blue-100/20 px-4 py-8 text-slate-900 dark:bg-linear-to-b dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50 sm:px-6 lg:px-10">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
        <header className="space-y-3 rounded-3xl bg-white/80 p-6 shadow-sm backdrop-blur dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">Módulo avanzado</p>
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
        </header>

        

        <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.3em] text-bsc-blue-medium dark:text-bsc-blue-medium-dark">Modo de trabajo</p>
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
           <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="w-full sm:w-72">
                <Select
                  label="Modelo"
                  value={providerId !== null ? String(providerId) : ''}
                  onChange={(event) => setProviderId(Number(event.target.value))}
                  disabled={!canChangeProvider || isProcessing || isLoadingProviders || sortedProviders.length === 0} // NOSONAR
                  helperText={providerHelperText}
                >
                  {isLoadingProviders && <option value="">Cargando modelos…</option>}
                  {!isLoadingProviders && sortedProviders.length === 0 && <option value="">Sin modelos disponibles</option>}
                  {sortedProviders.map((record) => (
                    <option key={record.id} value={String(record.id)}>
                      {record.name}
                      {record.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </Select>
              </div>

              {providersError && (
                <div className="w-full sm:w-auto">
                  <p className="text-xs text-red-600 dark:text-red-200">{providersError.message}</p>
                </div>
              )}
            </div>
          
          {mode === 'grammar' ? (
            <div className="max-w-sm">
              <LanguageSelector
                label="Idioma"
                selectedCode={sourceLang}
                onChange={setSourceLang}
                allowedIsoCodes={providerInputCodes}
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
                  selectedCode={sourceLang}
                  onChange={setSourceLang}
                  allowedIsoCodes={providerInputCodes}
                />
              </div>
              <div className="flex items-center justify-center lg:pt-9">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Intercambiar idiomas"
                  onClick={handleSwapLanguages}
                  disabled={isProcessing}
                >
                  <SwapIcon />
                </Button>
              </div>
              <div className="flex-1">
                <LanguageSelector
                  label="Idioma destino"
                  selectedCode={targetLang}
                  onChange={setTargetLang}
                  excludeCode={sourceLang}
                  allowedIsoCodes={providerOutputCodes}
                />
              </div>
            </div>
          )}
        </Card>
            {status && (
              <Alert variant={status.variant} title={status.title} description={status.description} className="shadow-sm" />
            )}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card padding="lg" className="space-y-4 border border-gray-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-bsc-blue-dark dark:text-white">Texto origen</h3>
              </div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                {inputCharacters.toLocaleString('es-ES')} / {MAX_CHARACTERS.toLocaleString('es-ES')}
              </div>
            </div>

            {mode === 'post-editing' && (
              <div aria-hidden="true" className="pointer-events-none opacity-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Tono"
                    value={postEditTone}
                    onChange={() => {}}
                    disabled
                    options={POST_EDIT_TONES}
                    className="bg-white dark:bg-slate-800 h-8 text-sm py-1!"
                  />
                  <Select
                    label="Longitud"
                    value={postEditLength}
                    onChange={() => {}}
                    disabled
                    options={POST_EDIT_LENGTHS}
                    className="bg-white dark:bg-slate-800 h-8 text-sm py-1!"
                  />
                </div>
              </div>
            )}

            

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={triggerFileDialog}
                  disabled={isProcessing}
                >
                  {fileButtonText}
                </Button>
                
                <Button type="button" variant="ghost" size="sm" onClick={resetInput} disabled={isProcessing}>
                  Limpiar texto
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleProcess}
                    disabled={!canTranslateInput || isProcessing}
                  >
                    {isProcessing ? 'Procesando…' : activeConfig.actionLabel}
                  </Button>
              
              </div>
            </div>
            <Textarea
              placeholder="Escribe, pega o importa tu texto aquí…"
              rows={14}
              value={inputText}
              ref={inputTextareaRef}
              onChange={handleInputChange}
              disabled={isProcessing}
              className={[
                'bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500',
                mode === 'grammar'
                  ? 'selection:bg-emerald-200/70 selection:text-slate-900 dark:selection:bg-emerald-500/20 dark:selection:text-slate-50'
                  : '',
              ].join(' ')}
              helperText={inputHelperText}
              error={charError ?? undefined}
            />
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
                <h3 className="text-xl font-semibold text-bsc-blue-dark dark:text-white">Resultado</h3>
                
              </div>
            </div>
              <div className="flex flex-wrap items-center gap-3">
                {mode === 'post-editing' && (
                  <>
                    <Select
                      label="Tono"
                      value={postEditTone}
                      onChange={(event) => setPostEditTone(event.target.value as PostEditTone)}
                      disabled={isProcessing}
                      options={POST_EDIT_TONES}
                      className="min-w-40 bg-white dark:bg-slate-800 h-8 text-sm py-1!"
                    />
                    <Select
                      label="Longitud"
                      value={postEditLength}
                      onChange={(event) => setPostEditLength(event.target.value as PostEditLength)}
                      disabled={isProcessing}
                      options={POST_EDIT_LENGTHS}
                      className="min-w-40 bg-white dark:bg-slate-800 h-8 text-sm py-1!"
                    />
                  </>
                )}
                <div className='flex gap-3'>

                <Select
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                  className="min-w-35 bg-white dark:bg-slate-800 h-8 text-sm py-1!"
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
                {mode === 'post-editing' && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handlePostEdit}
                    disabled={!canPostEditOutput || isProcessing}
                    className="sm:ml-auto"
                  >
                    {isProcessing ? 'Procesando…' : POST_EDITING_BUTTON_LABEL}
                  </Button>
                )}
              </div>

            <div className="relative">
              {mode === 'grammar' ? (
                <div
                  className="min-h-87.5 rounded-lg border border-gray-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                  aria-label="Texto corregido"
                >
                  <div ref={grammarOutputRef} className="relative whitespace-pre-wrap wrap-break-word">
                    {renderHighlightedText(
                      outputText,
                      grammarHighlightSpans,
                      hoveredGrammarSuggestionId,
                      setHoveredGrammarSuggestionId,
                      handleGrammarSpanEnter,
                      handleGrammarSpanLeave,
                    )}
                    {grammarPopover && grammarSuggestions[grammarPopover.id] && (
                      <div
                        className="pointer-events-none absolute z-10 w-70 rounded-xl border border-gray-200 bg-white p-3 text-sm text-slate-800 shadow-lg dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        style={{ top: grammarPopover.top, left: grammarPopover.left }}
                        role="tooltip"
                      >
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Posición: {grammarSuggestions[grammarPopover.id].position}
                        </p>
                        <p className="mt-2">
                          <span className="font-semibold">Original:</span> {grammarSuggestions[grammarPopover.id].original}
                        </p>
                        <p className="mt-1">
                          <span className="font-semibold">Corrección:</span>{' '}
                          {grammarSuggestions[grammarPopover.id].correction}
                        </p>
                        {grammarSuggestions[grammarPopover.id].explanation && (
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                            {grammarSuggestions[grammarPopover.id].explanation}
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
                  value={outputText}
                  ref={outputTextareaRef}
                  onChange={(event) => {
                    if (mode === 'post-editing') {
                      setOutputText(event.target.value)
                    }
                  }}
                  readOnly={mode !== 'post-editing' || isProcessing}
                  className="bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
                />
              )}
              {isProcessing && (mode !== 'translate' || outputText.trim().length === 0) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
                  <div className="flex items-center gap-3 text-sm font-semibold text-bsc-blue-medium dark:text-bsc-blue-medium-dark">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-bsc-blue-medium border-t-transparent" />Procesando solicitud…
                  </div>
                </div>
              )}
            </div>

            {mode === 'grammar' && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {grammarHasErrors
                  ? 'Se detectaron sugerencias. Pasa el mouse por el texto subrayado para ver detalles.'
                  : 'No se detectaron errores.'}
              </div>
            )}
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
