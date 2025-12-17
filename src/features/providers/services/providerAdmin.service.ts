import apiClient from '../../../api/apiClient'
import { getApiErrorMessage } from '../../../api/apiError'
import type { ProviderConfiguration, ProviderCreateInput, ProviderLanguage, ProviderRecord, ProviderUpdateInput, ProvidersQueryParams } from '../types'

interface ProviderApiResponse {
  id: number
  name: string
  provider_type: string
  endpoint: string
  region: string
  input_language_ids?: number[]
  output_language_ids?: number[]
  is_active: boolean
  is_default: boolean
  configuration?: ProviderConfiguration
  input_languages?: ProviderLanguageApiResponse[]
  output_languages?: ProviderLanguageApiResponse[]
  created_at: string
  updated_at: string
}

interface ProviderLanguageApiResponse {
  id: number
  code: string
  name: string
  native_name?: string
  is_active: boolean
  sort_order?: number
}

const PROVIDERS_BASE_PATH = '/translations/providers'
const DEFAULT_LIMIT = 20

const normalizePagination = (params?: ProvidersQueryParams) => {
  const skip = params?.skip && params.skip > 0 ? params.skip : 0
  const limit = params?.limit && params.limit > 0 ? params.limit : DEFAULT_LIMIT
  return { skip, limit }
}

const mapProviderLanguage = (payload: ProviderLanguageApiResponse): ProviderLanguage => ({
  id: payload.id,
  code: payload.code,
  name: payload.name,
  nativeName: payload.native_name,
  isActive: payload.is_active,
  sortOrder: payload.sort_order,
})

const mapProvider = (payload: ProviderApiResponse): ProviderRecord => ({
  id: payload.id,
  name: payload.name,
  providerType: payload.provider_type,
  endpoint: payload.endpoint,
  region: payload.region,
  inputLanguageIds: payload.input_language_ids ?? [],
  outputLanguageIds: payload.output_language_ids ?? [],
  isActive: payload.is_active,
  isDefault: payload.is_default,
  configuration: payload.configuration ?? {},
  inputLanguages: (payload.input_languages ?? []).map(mapProviderLanguage),
  outputLanguages: (payload.output_languages ?? []).map(mapProviderLanguage),
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
})

class ProviderAdminService {
  async list(params?: ProvidersQueryParams): Promise<{ data: ProviderRecord[]; skip: number; limit: number }> {
    const pagination = normalizePagination(params)
    try {
      const { data } = await apiClient.get<ProviderApiResponse[]>(PROVIDERS_BASE_PATH, { params: pagination })
      return { data: data.map(mapProvider), ...pagination }
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos obtener la lista de proveedores.'))
    }
  }

  async create(payload: ProviderCreateInput): Promise<ProviderRecord> {
    try {
      const { data } = await apiClient.post<ProviderApiResponse>(PROVIDERS_BASE_PATH, {
        name: payload.name,
        provider_type: payload.providerType,
        endpoint: payload.endpoint,
        region: payload.region,
        input_language_ids: payload.inputLanguageIds,
        output_language_ids: payload.outputLanguageIds,
        api_key: payload.apiKey,
        configuration: payload.configuration,
        is_active: payload.isActive,
        is_default: payload.isDefault,
      })
      return mapProvider(data)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos crear el proveedor.'))
    }
  }

  async update(providerId: number, payload: ProviderUpdateInput): Promise<ProviderRecord> {
    try {
      const body: Record<string, unknown> = {
        name: payload.name,
        endpoint: payload.endpoint,
        region: payload.region,
        configuration: payload.configuration,
        is_active: payload.isActive,
        is_default: payload.isDefault,
        input_language_ids: payload.inputLanguageIds,
        output_language_ids: payload.outputLanguageIds,
      }

      if (typeof payload.apiKey === 'string' && payload.apiKey.trim().length > 0) {
        body.api_key = payload.apiKey
      }

      const { data } = await apiClient.put<ProviderApiResponse>(`${PROVIDERS_BASE_PATH}/${providerId}`, body)
      return mapProvider(data)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos actualizar el proveedor.'))
    }
  }

  async remove(providerId: number): Promise<void> {
    try {
      await apiClient.delete(`${PROVIDERS_BASE_PATH}/${providerId}`)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos eliminar el proveedor.'))
    }
  }
}

export const providerAdminService = new ProviderAdminService()
