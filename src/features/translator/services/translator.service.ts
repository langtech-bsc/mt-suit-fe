import apiClient from '../../../api/apiClient'
import { getApiErrorMessage } from '../../../api/apiError'
import axios from 'axios'

export type TranslatorMode = 'translate' | 'grammar' | 'post-editing'

export interface TranslateRequestBody {
  text: string
  sourceLanguage: string
  targetLanguage: string
  providerId?: number
}

export interface GrammarRequestBody {
  text: string
  language: string
  providerId?: number
}

export interface PostEditRequestBody {
  text: string
  language: string
  providerId?: number
}

const TRANSLATOR_ENDPOINTS: Record<TranslatorMode, string> = {
  translate: '/translations/translate/stream',
  grammar: '/translations/grammar-check',
  'post-editing': '/post-edit',
}

function extractResult(payload: unknown): string {
  if (!payload) {
    return ''
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (typeof payload === 'object') {
    const candidateKeys = [
      'result',
      'output',
      'data',
      'translation',
      'translated_text',
      'translatedText',
      'corrected_text',
      'correctedText',
      'postEditedText',
      'text',
      'message',
    ] as const

    for (const key of candidateKeys) {
      const value = (payload as Record<string, unknown>)[key]
      if (typeof value === 'string' && value.trim().length > 0) {
        return value
      }
    }
  }

  try {
    return JSON.stringify(payload)
  } catch {
    return ''
  }
}

export type GrammarSuggestion = {
  original: string
  correction: string
  explanation: string
  position: number
}

type GrammarCheckApiResponse = {
  corrected_text?: string
  suggestions?: GrammarSuggestion[]
  has_errors?: boolean
}

const normalizeMaybeJsonString = (value: string): string => {
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return value
  }

  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    return value
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    return typeof parsed === 'string' ? parsed : value
  } catch {
    return value
  }
}

export async function requestTranslation(body: TranslateRequestBody): Promise<string> {
  return requestTranslationStream(body, () => {})
}

export async function requestTranslationStream(
  body: TranslateRequestBody,
  onChunk: (nextText: string, fullText: string) => void,
  options?: { signal?: AbortSignal },
): Promise<string> {
  let streamedText = ''

  try {
    const response = await apiClient.post<string>(
      TRANSLATOR_ENDPOINTS.translate,
      {
        source_language_code: body.sourceLanguage,
        target_language_code: body.targetLanguage,
        text: body.text,
        provider_id: body.providerId,
      },
      {
        responseType: 'text',
        signal: options?.signal,
        onDownloadProgress: (progressEvent) => {
          const xhr = progressEvent.event?.target as XMLHttpRequest | undefined
          const nextText = xhr?.responseText
          if (typeof nextText !== 'string') {
            return
          }

          if (nextText.length <= streamedText.length) {
            streamedText = nextText
            return
          }

          const delta = nextText.slice(streamedText.length)
          streamedText = nextText
          onChunk(delta, streamedText)
        },
      },
    )

    const finalText = typeof response.data === 'string' ? response.data : streamedText
    return extractResult(normalizeMaybeJsonString(finalText))
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') {
      throw error
    }
    throw new Error(getApiErrorMessage(error, 'No pudimos traducir el texto.'))
  }
}

export async function requestGrammarCheck(body: GrammarRequestBody): Promise<string> {
  const response = await requestGrammarCheckDetailed(body)
  return response.correctedText
}

export async function requestGrammarCheckDetailed(
  body: GrammarRequestBody,
): Promise<{ correctedText: string; suggestions: GrammarSuggestion[]; hasErrors: boolean }> {
  try {
    const response = await apiClient.post<GrammarCheckApiResponse>(TRANSLATOR_ENDPOINTS.grammar, {
      text: body.text,
      language_code: body.language,
      provider_id: body.providerId,
    })

    const correctedText = extractResult(response.data)
    return {
      correctedText,
      suggestions: response.data?.suggestions ?? [],
      hasErrors: Boolean(response.data?.has_errors),
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'No pudimos corregir la gramática.'))
  }
}

export async function requestPostEditing(body: PostEditRequestBody): Promise<string> {
  try {
    const response = await apiClient.post(TRANSLATOR_ENDPOINTS['post-editing'], body)
    return extractResult(response.data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'No pudimos mejorar la traducción.'))
  }
}
