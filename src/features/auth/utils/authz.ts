import type { AuthUser } from '../types'

export const isAdminUser = (user: AuthUser | null | undefined) => {
  if (!user) {
    return false
  }
  if (user.isSuperuser) {
    return true
  }
  return user.roles.some((role) => role.toLowerCase() === 'admin')
}

export const isSuperAdminUser = (user: AuthUser | null | undefined) => {
  return Boolean(user?.isSuperuser)
}

