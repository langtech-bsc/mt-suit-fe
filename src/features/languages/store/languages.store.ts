import { create } from 'zustand'
import type { LanguageRecord } from '../types'
import { SUPPORTED_LANGUAGES } from '../../../data/languages'

interface LanguagesState {
  languages: LanguageRecord[]
  setLanguages: (languages: LanguageRecord[]) => void
  upsertLanguage: (language: LanguageRecord) => void
  removeLanguage: (id: number) => void
  getByIsoCode: (isoCode: string) => LanguageRecord | undefined
}

const seedLanguages: LanguageRecord[] = SUPPORTED_LANGUAGES.map((language, index) => ({
  id: -(index + 1),
  name: language.name,
  isoCode: language.code,
  flagUrl: null,
  isActive: true,
}))

export const useLanguagesStore = create<LanguagesState>((set, get) => ({
  languages: seedLanguages,
  setLanguages(languages) {
    set({ languages })
  },
  upsertLanguage(language) {
    set((state) => {
      const existing = state.languages.findIndex((item) => item.id === language.id)
      if (existing === -1) {
        return { languages: [language, ...state.languages] }
      }
      const copy = [...state.languages]
      copy[existing] = language
      return { languages: copy }
    })
  },
  removeLanguage(id) {
    set((state) => ({
      languages: state.languages.filter((item) => item.id !== id),
    }))
  },
  getByIsoCode(isoCode) {
    const normalized = isoCode.trim().toLowerCase()
    return get().languages.find((language) => language.isoCode.toLowerCase() === normalized)
  },
}))

