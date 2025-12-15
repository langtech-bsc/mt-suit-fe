export type ProvidersQueryParams = {
  skip?: number
  limit?: number
}

export type ProviderConfiguration = Record<string, unknown>

export interface ProviderRecord {
  id: number
  name: string
  providerType: string
  endpoint: string
  region: string
  isActive: boolean
  isDefault: boolean
  configuration: ProviderConfiguration
  createdAt: string
  updatedAt: string
}

export type ProviderCreateInput = {
  name: string
  providerType: string
  endpoint: string
  region: string
  apiKey: string
  configuration: ProviderConfiguration
  isActive: boolean
  isDefault: boolean
}

export type ProviderUpdateInput = {
  name: string
  endpoint: string
  region: string
  apiKey?: string
  configuration: ProviderConfiguration
  isActive: boolean
  isDefault: boolean
}

