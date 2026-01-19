import apiClient from '../../../api/apiClient'
import { getApiErrorMessage } from '../../../api/apiError'

type LanguageApiResponse = {
  code: string
  name: string
  native_name: string
  id: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type TranslateDocumentApiResponse = {
  filename: string
  translated_filename: string
  file_base64: string
  source_language: LanguageApiResponse
  target_language: LanguageApiResponse
  character_count: number
  created_at: string
}

export type DocumentTranslationResult = {
  filename: string
  translatedFilename: string
  blob: Blob
  characterCount: number
  createdAt: string
  sourceLanguageCode: string
  targetLanguageCode: string
}

export type TranslateDocumentInput = {
  file: File
  sourceLanguageCode: string
  targetLanguageCode: string
  providerId?: number | null
  asFile?: boolean
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}

const TRANSLATE_DOCUMENT_PATH = '/translations/translate/document'

const mapLanguageCode = (payload: LanguageApiResponse | undefined) => payload?.code ?? ''

const parseContentDispositionFilename = (raw: string | undefined): string | null => {
  if (!raw) return null

  const matchStar = raw.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (matchStar?.[1]) {
    try {
      return decodeURIComponent(matchStar[1].trim())
    } catch {
      return matchStar[1].trim()
    }
  }

  const match = raw.match(/filename\s*=\s*\\"?([^\\";]+)\\"?/i)
  if (match?.[1]) return match[1].trim()

  return null
}

const base64ToBlob = (base64: string, contentType?: string) => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: contentType ?? 'application/octet-stream' })
}

const resolveContentTypeFromFilename = (filename: string) => {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lower.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

const parseJsonBlob = async <T,>(blob: Blob): Promise<T | null> => {
  try {
    const text = await blob.text()
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export const documentTranslationService = {
  async translate(input: TranslateDocumentInput): Promise<DocumentTranslationResult> {
    try {
      const formData = new FormData()
      formData.append('file', input.file)

      const response = await apiClient.post<TranslateDocumentApiResponse | Blob>(TRANSLATE_DOCUMENT_PATH, formData, {
        params: {
          source_language_code: input.sourceLanguageCode,
          target_language_code: input.targetLanguageCode,
          provider_id: input.providerId ?? undefined,
          as_file: input.asFile ?? false,
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: input.signal,
        responseType: input.asFile ? 'blob' : 'json',
        onUploadProgress: (event) => {
          if (!input.onProgress) return
          if (!event.total) return
          const progress = Math.round((event.loaded / event.total) * 60)
          input.onProgress(Math.min(60, Math.max(0, progress)))
        },
        onDownloadProgress: (event) => {
          if (!input.onProgress) return
          if (!event.total) return
          const progress = 60 + Math.round((event.loaded / event.total) * 40)
          input.onProgress(Math.min(100, Math.max(60, progress)))
        },
      })

      input.onProgress?.(90)

      const contentDisposition = response.headers?.['content-disposition'] as string | undefined
      const contentType = response.headers?.['content-type'] as string | undefined

      if (input.asFile) {
        const blob = response.data as Blob
        const filenameFromHeader = parseContentDispositionFilename(contentDisposition)
        const fallbackFilename = input.file.name.replace(/(\.[^./\\]+)?$/, '-translated$1')
        const translatedFilename = filenameFromHeader ?? fallbackFilename

        if (contentType?.includes('application/json')) {
          const json = await parseJsonBlob<TranslateDocumentApiResponse>(blob)
          if (json?.file_base64) {
            const resolvedType = resolveContentTypeFromFilename(json.translated_filename)
            return {
              filename: json.filename,
              translatedFilename: json.translated_filename,
              blob: base64ToBlob(json.file_base64, resolvedType),
              characterCount: json.character_count,
              createdAt: json.created_at,
              sourceLanguageCode: mapLanguageCode(json.source_language),
              targetLanguageCode: mapLanguageCode(json.target_language),
            }
          }
        }

        return {
          filename: input.file.name,
          translatedFilename,
          blob,
          characterCount: 0,
          createdAt: new Date().toISOString(),
          sourceLanguageCode: input.sourceLanguageCode,
          targetLanguageCode: input.targetLanguageCode,
        }
      }

      const data = response.data as TranslateDocumentApiResponse
      const resolvedType = resolveContentTypeFromFilename(data.translated_filename)

      return {
        filename: data.filename,
        translatedFilename: data.translated_filename,
        blob: base64ToBlob(data.file_base64, resolvedType),
        characterCount: data.character_count,
        createdAt: data.created_at,
        sourceLanguageCode: mapLanguageCode(data.source_language),
        targetLanguageCode: mapLanguageCode(data.target_language),
      }
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Error desconocido.'))
    }
  },
}

