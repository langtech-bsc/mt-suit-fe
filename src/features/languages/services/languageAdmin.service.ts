import apiClient from '../../../api/apiClient'
import { getApiErrorMessage } from '../../../api/apiError'
import type { LanguageRecord, LanguageUpsertInput } from '../types'

interface LanguageApiResponse {
  id: number
  name?: string
  iso_code?: string
  code?: string
  flag_url?: string | null
  flag?: string | null
  is_active?: boolean
}

const LANGUAGES_BASE_PATH = '/languages'

const mapLanguage = (payload: LanguageApiResponse): LanguageRecord => ({
  id: payload.id,
  name: payload.name ?? '',
  isoCode: payload.iso_code ?? payload.code ?? '',
  flagUrl: payload.flag_url ?? payload.flag ?? null,
  isActive: payload.is_active ?? true,
})

const normalizeIsoCode = (value: string) => value.trim().toLowerCase()

class LanguageAdminService {
  async list(): Promise<LanguageRecord[]> {
    try {
      const { data } = await apiClient.get<LanguageApiResponse[]>(LANGUAGES_BASE_PATH)
      return data.map(mapLanguage)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos cargar los idiomas.'))
    }
  }

  async create(input: LanguageUpsertInput): Promise<LanguageRecord> {
    try {
      if (input.flagFile) {
        const form = new FormData()
        form.append('name', input.name)
        form.append('iso_code', normalizeIsoCode(input.isoCode))
        form.append('flag', input.flagFile)
        const { data } = await apiClient.post<LanguageApiResponse>(LANGUAGES_BASE_PATH, form)
        return mapLanguage(data)
      }

      const body = {
        name: input.name,
        iso_code: normalizeIsoCode(input.isoCode),
        flag_url: input.flagUrl ?? null,
      }
      const { data } = await apiClient.post<LanguageApiResponse>(LANGUAGES_BASE_PATH, body)
      return mapLanguage(data)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos crear el idioma.'))
    }
  }

  async update(id: number, input: LanguageUpsertInput): Promise<LanguageRecord> {
    try {
      if (input.flagFile) {
        const form = new FormData()
        form.append('name', input.name)
        form.append('iso_code', normalizeIsoCode(input.isoCode))
        form.append('flag', input.flagFile)
        if (typeof input.isActive === 'boolean') {
          form.append('is_active', String(input.isActive))
        }
        const { data } = await apiClient.patch<LanguageApiResponse>(`${LANGUAGES_BASE_PATH}/${id}`, form)
        return mapLanguage(data)
      }

      const body = {
        name: input.name,
        iso_code: normalizeIsoCode(input.isoCode),
        flag_url: input.flagUrl ?? null,
        is_active: typeof input.isActive === 'boolean' ? input.isActive : undefined,
      }
      const { data } = await apiClient.patch<LanguageApiResponse>(`${LANGUAGES_BASE_PATH}/${id}`, body)
      return mapLanguage(data)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos actualizar el idioma.'))
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await apiClient.delete(`${LANGUAGES_BASE_PATH}/${id}`)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos eliminar el idioma.'))
    }
  }
}

export const languageAdminService = new LanguageAdminService()

