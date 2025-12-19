import apiClient from '../../../api/apiClient'
import { getApiErrorMessage } from '../../../api/apiError'
import type { LanguageRecord, LanguageUpsertInput } from '../types'

interface LanguageApiResponse {
  code: string
  name: string
  native_name?: string
  id: number
  is_active: boolean
  sort_order?: number
  created_at?: string
  updated_at?: string
}

const LANGUAGES_BASE_PATH = '/translations/languages'

const mapLanguage = (payload: LanguageApiResponse): LanguageRecord => ({
  id: payload.id,
  name: payload.name ?? '',
  nativeName: payload.native_name,
  isoCode: payload.code ?? '',
  isActive: payload.is_active ?? true,
  sortOrder: payload.sort_order,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
})

const normalizeIsoCode = (value: string) => value.trim().toLowerCase()

class LanguageAdminService {
  async list(params?: { skip?: number; limit?: number; onlyActive?: boolean }): Promise<LanguageRecord[]> {
    try {
      const { data } = await apiClient.get<LanguageApiResponse[]>(LANGUAGES_BASE_PATH, {
        params: {
          skip: params?.skip ?? 0,
          limit: params?.limit ?? 200,
          only_active: params?.onlyActive ?? false,
        },
      })
      return data.map(mapLanguage)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos cargar los idiomas.'))
    }
  }

  async create(input: LanguageUpsertInput): Promise<LanguageRecord> {
    try {
      const body = {
        code: normalizeIsoCode(input.isoCode),
        name: input.name,
        native_name: input.nativeName ?? input.name,
        sort_order: input.sortOrder ?? 0,
      }
      const { data } = await apiClient.post<LanguageApiResponse>(LANGUAGES_BASE_PATH, body)
      return mapLanguage(data)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Error desconocido.'))
    }
  }

  async update(id: number, input: LanguageUpsertInput): Promise<LanguageRecord> {
    try {
      const body = {
        name: input.name,
        native_name: input.nativeName ?? input.name,
        is_active: input.isActive ?? true,
        sort_order: input.sortOrder ?? 0,
      }
      const { data } = await apiClient.put<LanguageApiResponse>(`${LANGUAGES_BASE_PATH}/${id}`, body)
      return mapLanguage(data)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Error desconocido.'))
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await apiClient.delete(`${LANGUAGES_BASE_PATH}/${id}`)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Error desconocido.'))
    }
  }
}

export const languageAdminService = new LanguageAdminService()
