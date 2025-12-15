import apiClient from '../../../api/apiClient'
import { getApiErrorMessage } from '../../../api/apiError'
import type { ProviderConfiguration, ProviderCreateInput, ProviderRecord, ProviderUpdateInput, ProvidersQueryParams } from '../types'

interface ProviderApiResponse {
  id: number
  name: string
  provider_type: string
  endpoint: string
  region: string
  is_active: boolean
  is_default: boolean
  configuration?: ProviderConfiguration
  created_at: string
  updated_at: string
}

const PROVIDERS_BASE_PATH = '/translations/providers'
const DEFAULT_LIMIT = 20

const normalizePagination = (params?: ProvidersQueryParams) => {
  const skip = params?.skip && params.skip > 0 ? params.skip : 0
  const limit = params?.limit && params.limit > 0 ? params.limit : DEFAULT_LIMIT
  return { skip, limit }
}

const mapProvider = (payload: ProviderApiResponse): ProviderRecord => ({
  id: payload.id,
  name: payload.name,
  providerType: payload.provider_type,
  endpoint: payload.endpoint,
  region: payload.region,
  isActive: payload.is_active,
  isDefault: payload.is_default,
  configuration: payload.configuration ?? {},
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

