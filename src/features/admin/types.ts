export interface AdminPermission {
  id: number
  name: string
  description: string
  resource: string
  action: string
  createdAt: string
}

export interface AdminRole {
  id: number
  name: string
  description: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  permissions: AdminPermission[]
}

export interface AdminUserRecord {
  id: number
  username: string
  email: string
  isActive: boolean
  isSuperuser: boolean
  createdAt: string
  updatedAt: string
  roles: AdminRole[]
}

export interface UsersQueryParams {
  skip?: number
  limit?: number
}
