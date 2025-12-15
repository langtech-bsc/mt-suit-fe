import { useQuery } from '@tanstack/react-query'
import { providersService } from '../services/providers.service'
import type { ProviderRecord } from '../types'

export const useProvidersQuery = () => {
  return useQuery<ProviderRecord[], Error>({
    queryKey: ['providers', { skip: 0, limit: 100 }],
    queryFn: () => providersService.list({ skip: 0, limit: 100 }),
    retry: 1,
    staleTime: 60_000,
  })
}

