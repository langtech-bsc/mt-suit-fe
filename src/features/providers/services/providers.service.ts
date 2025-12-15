import type { ProviderRecord, ProvidersQueryParams } from '../types'
import { providerAdminService } from './providerAdmin.service'

class ProvidersService {
  async list(params?: ProvidersQueryParams): Promise<ProviderRecord[]> {
    const payload = await providerAdminService.list(params)
    return payload.data
  }
}

export const providersService = new ProvidersService()

