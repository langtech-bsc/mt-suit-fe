export interface LanguageRecord {
  id: number
  name: string
  isoCode: string
  flagUrl: string | null
  isActive: boolean
}

export interface LanguageUpsertInput {
  name: string
  isoCode: string
  flagUrl?: string | null
  flagFile?: File | null
  isActive?: boolean
}

