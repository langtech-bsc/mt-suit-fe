import apiClient from '../../../api/apiClient'
import { getApiErrorMessage } from '../../../api/apiError'
import type { AdminPermission, AdminRole } from '../types'

interface RolesApiResponse {
  name: string
  description: string
  is_default: boolean
  id: number
  created_at: string
  updated_at: string
  permissions?: PermissionApiResponse[]
}

interface PermissionApiResponse {
  id: number
  name: string
  description: string
  resource: string
  action: string
  created_at: string
}

const ROLES_BASE_PATH = '/roles/roles'
const ROLES_ASSIGN_PATH = '/roles/roles/assign'

const mapPermission = (payload: PermissionApiResponse): AdminPermission => ({
  id: payload.id,
  name: payload.name,
  description: payload.description,
  resource: payload.resource,
  action: payload.action,
  createdAt: payload.created_at,
})

const mapRole = (payload: RolesApiResponse): AdminRole => ({
  id: payload.id,
  name: payload.name,
  description: payload.description,
  isDefault: payload.is_default,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
  permissions: (payload.permissions ?? []).map(mapPermission),
})

class AdminRolesService {
  async list(): Promise<AdminRole[]> {
    try {
      const { data } = await apiClient.get<RolesApiResponse[]>(ROLES_BASE_PATH)
      return data.map(mapRole)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos obtener la lista de roles.'))
    }
  }

  async assignRole(payload: { userId: number; roleId: number }): Promise<void> {
    try {
      await apiClient.post(ROLES_ASSIGN_PATH, {
        user_id: payload.userId,
        role_id: payload.roleId,
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Error desconocido.'))
    }
  }
}

export const adminRolesService = new AdminRolesService()
