export interface LanguageRecord {
  id: number
  name: string
  isoCode: string
  nativeName?: string
  isActive: boolean
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface LanguageUpsertInput {
  name: string
  isoCode: string
  nativeName?: string
  sortOrder?: number
  isActive?: boolean
}
