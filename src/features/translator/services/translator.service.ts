import apiClient from '../../../api/apiClient'
import { getApiErrorMessage } from '../../../api/apiError'

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
  translate: '/translations/translate',
  grammar: '/grammar-check',
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

export async function requestTranslation(body: TranslateRequestBody): Promise<string> {
  try {
    const response = await apiClient.post(TRANSLATOR_ENDPOINTS.translate, {
      source_language_code: body.sourceLanguage,
      target_language_code: body.targetLanguage,
      text: body.text,
      provider_id: body.providerId,
    })

    return extractResult(response.data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'No pudimos traducir el texto.'))
  }
}

export async function requestGrammarCheck(body: GrammarRequestBody): Promise<string> {
  try {
    const response = await apiClient.post(TRANSLATOR_ENDPOINTS.grammar, body)
    return extractResult(response.data)
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
