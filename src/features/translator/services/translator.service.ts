import apiClient from '../../../api/apiClient'

export type TranslatorMode = 'translate' | 'grammar' | 'post-editing'

export interface TranslateRequestBody {
  text: string
  sourceLanguage: string
  targetLanguage: string
}

export interface GrammarRequestBody {
  text: string
  language: string
}

export interface PostEditRequestBody {
  text: string
  language: string
}

const TRANSLATOR_ENDPOINTS: Record<TranslatorMode, string> = {
  translate: '/translate',
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
  const response = await apiClient.post(TRANSLATOR_ENDPOINTS.translate, body)
  return extractResult(response.data)
}

export async function requestGrammarCheck(body: GrammarRequestBody): Promise<string> {
  const response = await apiClient.post(TRANSLATOR_ENDPOINTS.grammar, body)
  return extractResult(response.data)
}

export async function requestPostEditing(body: PostEditRequestBody): Promise<string> {
  const response = await apiClient.post(TRANSLATOR_ENDPOINTS['post-editing'], body)
  return extractResult(response.data)
}
