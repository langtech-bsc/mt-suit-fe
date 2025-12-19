import apiClient from '../../../api/apiClient'
import { getApiErrorMessage } from '../../../api/apiError'
import type { AdminPermission, AdminRole, AdminUserRecord, UsersQueryParams } from '../types'

interface UsersApiResponse {
  username: string
  email: string
  id: number
  is_active: boolean
  is_superuser: boolean
  created_at: string
  updated_at: string
  roles?: RoleApiResponse[]
}

interface RoleApiResponse {
  id: number
  name: string
  description: string
  is_default: boolean
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

const USERS_BASE_PATH = '/users'
const DEFAULT_LIMIT = 20

const mapPermission = (payload: PermissionApiResponse): AdminPermission => ({
  id: payload.id,
  name: payload.name,
  description: payload.description,
  resource: payload.resource,
  action: payload.action,
  createdAt: payload.created_at,
})

const mapRole = (payload: RoleApiResponse): AdminRole => ({
  id: payload.id,
  name: payload.name,
  description: payload.description,
  isDefault: payload.is_default,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
  permissions: (payload.permissions ?? []).map(mapPermission),
})

const mapUser = (payload: UsersApiResponse): AdminUserRecord => ({
  id: payload.id,
  username: payload.username,
  email: payload.email,
  isActive: payload.is_active,
  isSuperuser: payload.is_superuser,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
  roles: (payload.roles ?? []).map(mapRole),
})

const normalizePagination = (params?: UsersQueryParams) => {
  const skip = params?.skip && params.skip > 0 ? params.skip : 0
  const limit = params?.limit && params.limit > 0 ? params.limit : DEFAULT_LIMIT
  return { skip, limit }
}

class AdminUsersService {
  async list(params?: UsersQueryParams): Promise<{ data: AdminUserRecord[]; skip: number; limit: number }> {
    const pagination = normalizePagination(params)
    try {
      const { data } = await apiClient.get<UsersApiResponse[]>(USERS_BASE_PATH, {
        params: pagination,
      })
      return {
        data: data.map(mapUser),
        ...pagination,
      }
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No pudimos obtener la lista de usuarios.'))
    }
  }

  async create(payload: { username: string; email: string; password: string }): Promise<AdminUserRecord> {
    try {
      const { data } = await apiClient.post<UsersApiResponse>(USERS_BASE_PATH, payload)
      return mapUser(data)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Error desconocido.'))
    }
  }

  async update(
    userId: number,
    payload: { username: string; email: string; is_active: boolean; password?: string; is_superuser?: boolean },
  ): Promise<AdminUserRecord> {
    try {
      const { data } = await apiClient.put<UsersApiResponse>(`${USERS_BASE_PATH}/${userId}`, payload)
      return mapUser(data)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Error desconocido.'))
    }
  }
}

export const adminUsersService = new AdminUsersService()
