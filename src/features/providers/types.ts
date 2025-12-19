export type ProvidersQueryParams = {
  skip?: number
  limit?: number
}

export type ProviderConfiguration = Record<string, unknown>

export type ProviderLanguage = {
  id: number
  code: string
  name: string
  nativeName?: string
  isActive: boolean
  sortOrder?: number
}

export interface ProviderRecord {
  id: number
  name: string
  providerType: string
  endpoint: string
  region: string
  apiKey: string
  inputLanguageIds: number[]
  outputLanguageIds: number[]
  isActive: boolean
  isDefault: boolean
  configuration: ProviderConfiguration
  inputLanguages: ProviderLanguage[]
  outputLanguages: ProviderLanguage[]
  createdAt: string
  updatedAt: string
}

export type ProviderCreateInput = {
  name: string
  providerType: string
  endpoint: string
  region: string
  inputLanguageIds: number[]
  outputLanguageIds: number[]
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
  inputLanguageIds: number[]
  outputLanguageIds: number[]
}
