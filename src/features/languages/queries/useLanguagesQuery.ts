import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { languageAdminService } from '../services/languageAdmin.service'
import { useLanguagesStore } from '../store/languages.store'
import type { LanguageRecord } from '../types'

export const useLanguagesQuery = () => {
  const setLanguages = useLanguagesStore((state) => state.setLanguages)

  const query = useQuery<LanguageRecord[], Error>({
    queryKey: ['languages'],
    queryFn: () => languageAdminService.list({ skip: 0, limit: 100, onlyActive: false }),
    retry: 1,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (query.data) {
      setLanguages(query.data)
    }
  }, [query.data, setLanguages])

  return query
}
