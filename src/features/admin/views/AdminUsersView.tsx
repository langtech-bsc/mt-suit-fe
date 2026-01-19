import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Badge, Button, Card, ConfirmDialog, PageLoader, Switch } from '../../../components/ui'
import { useAuthStore } from '../../auth/store/auth.store'
import { adminRolesService } from '../services/adminRoles.service'
import { adminUsersService } from '../services/adminUsers.service'
import type { AdminUserRecord } from '../types'
import { UsersFilters, type UsersFiltersState } from '../components/UsersFilters'
import { UserFormModal, type CreateUserInput, type EditUserInput } from '../components/UserFormModal'

const formatDateTime = (value?: string) => {
  if (!value) {
    return '—'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }
  return parsed.toLocaleString()
}

const buildOptimisticRoles = (
  existingRoles: AdminUserRecord['roles'],
  roleId?: number,
  roleName?: string,
): AdminUserRecord['roles'] => {
  if (typeof roleId !== 'number' || !roleName) {
    return existingRoles
  }
  return [
    {
      id: roleId,
      name: roleName,
      description: '',
      isDefault: false,
      createdAt: '',
      updatedAt: '',
      permissions: [],
    },
  ]
}

const applyOptimisticUserUpdate = (
  previous: { data: AdminUserRecord[]; skip: number; limit: number } | undefined,
  variables: {
    userId: number
    payload: { username: string; email: string; is_active: boolean; password?: string; is_superuser?: boolean }
    roleId?: number
    roleName?: string
  },
) => {
  if (!previous) {
    return previous
  }
  const { userId, payload, roleId, roleName } = variables

  return {
    ...previous,
    data: previous.data.map((existing) => {
      if (existing.id !== userId) {
        return existing
      }
      return {
        ...existing,
        username: payload.username,
        email: payload.email,
        isActive: payload.is_active,
        isSuperuser: typeof payload.is_superuser === 'boolean' ? payload.is_superuser : existing.isSuperuser,
        roles: buildOptimisticRoles(existing.roles, roleId, roleName),
      }
    }),
  }
}

const matchesQuery = (record: AdminUserRecord, query: string) => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  return (
    record.username.toLowerCase().includes(normalized) ??
    record.email.toLowerCase().includes(normalized)
  )
}

export const AdminUsersView = () => {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [filters, setFilters] = useState<UsersFiltersState>({
    query: '',
    status: 'all',
    role: 'all',
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUserRecord | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{ variant: 'success' | 'danger'; message: string } | null>(null)

  const pagination = useMemo(
    () => ({
      skip: 0,
      limit: 100,
    }),
    [],
  )

  const {
    data: usersPayload,
    error: usersError,
    isLoading: isLoadingUsers,
    isFetching: isFetchingUsers,
    refetch: refetchUsers,
  } = useQuery<{ data: AdminUserRecord[]; skip: number; limit: number }, Error>({
    queryKey: ['admin-users', pagination],
    queryFn: () => adminUsersService.list(pagination),
    retry: 1,
    staleTime: 30_000,
  })

  const users = useMemo(() => usersPayload?.data ?? [], [usersPayload])
  const usersErrorMessage = usersError?.message ?? null

  const { data: rolesPayload } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => adminRolesService.list(),
    retry: 1,
    staleTime: 60_000,
  })

  const roleOptions = useMemo(() => {
    const names = (rolesPayload ?? []).map((role) => role.name)
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [rolesPayload])

  const roleNameToId = useMemo(() => {
    return new Map((rolesPayload ?? []).map((role) => [role.name, role.id] as const))
  }, [rolesPayload])

  const filteredUsers = useMemo(() => {
    return users.filter((record) => {
      if (filters.status === 'active' && !record.isActive) {
        return false
      }
      if (filters.status === 'inactive' && record.isActive) {
        return false
      }
      if (filters.role !== 'all' && !record.roles.some((role) => role.name === filters.role)) {
        return false
      }
      return matchesQuery(record, filters.query)
    })
  }, [users, filters])

  const updateCachedUser = (updated: AdminUserRecord, previousRoles?: AdminUserRecord['roles']) => {
    queryClient.setQueriesData<{ data: AdminUserRecord[]; skip: number; limit: number }>(
      { queryKey: ['admin-users'] },
      (previous) => {
        if (!previous) {
          return previous
        }
        return {
          ...previous,
          data: previous.data.map((existing) => {
            if (existing.id !== updated.id) {
              return existing
            }
            const roles = updated.roles.length > 0 ? updated.roles : previousRoles ?? existing.roles
            return { ...updated, roles }
          }),
        }
      },
    )
  }

  const removeCachedUser = (userId: number) => {
    queryClient.setQueriesData<{ data: AdminUserRecord[]; skip: number; limit: number }>(
      { queryKey: ['admin-users'] },
      (previous) => {
        if (!previous) {
          return previous
        }
        return { ...previous, data: previous.data.filter((record) => record.id !== userId) }
      },
    )
  }

  const createUserMutation = useMutation<AdminUserRecord, Error, CreateUserInput>({
    mutationFn: async (payload) => {
      const { role, ...createPayload } = payload
      const created = await adminUsersService.create(createPayload)

      const roleName = role.trim()
      const roleId = roleNameToId.get(roleName)
      if (typeof roleId !== 'number') {
        throw new Error(t('adminUsers.errors.roleIdentify'))
      }
      await adminRolesService.assignRole({ userId: created.id, roleId })

      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setCreateOpen(false)
      setActionFeedback({ variant: 'success', message: t('adminUsers.feedback.created') })
    },
    onError: (error) => {
      setActionError(error.message)
    },
  })

  const updateUserMutation = useMutation<
    AdminUserRecord,
    Error,
    {
      userId: number
      payload: { username: string; email: string; is_active: boolean; password?: string; is_superuser?: boolean }
      roleId?: number
      roleName?: string
    },
    { snapshot: Array<[readonly unknown[], unknown]> }
  >({
    mutationFn: async ({ userId, payload, roleId }) => {
      if (typeof roleId === 'number') {
        await adminRolesService.assignRole({ userId, roleId })
      }
      return adminUsersService.update(userId, payload)
    },
    onMutate: async ({ userId, payload, roleId, roleName }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-users'] })
      const snapshot = queryClient.getQueriesData({ queryKey: ['admin-users'] })

      queryClient.setQueriesData<{ data: AdminUserRecord[]; skip: number; limit: number }>(
        { queryKey: ['admin-users'] },
        (previous) => applyOptimisticUserUpdate(previous, { userId, payload, roleId, roleName }),
      )

      return { snapshot }
    },
    onError: (error, _variables, context) => {
      if (context?.snapshot) {
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data)
        }
      }
      
      setActionError(error.message)
    },
    onSuccess: (updated, variables) => {
      const previousUser = users.find((item) => item.id === variables.userId)
      updateCachedUser(updated, previousUser?.roles)
      setEditingUser(null)
      setActionFeedback({ variant: 'success', message: t('adminUsers.feedback.updated') })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const deleteUserMutation = useMutation<void, Error, number>({
    mutationFn: (userId) => adminUsersService.remove(userId),
    onSuccess: (_, userId) => {
      removeCachedUser(userId)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      if (deletingUser) {
        setActionFeedback({ variant: 'success', message: t('adminUsers.feedback.deleted', { username: deletingUser.username }) })
      }
      setDeletingUser(null)
    },
    onError: (error) => {
      setActionFeedback({ variant: 'danger', message: error.message })
      setDeletingUser(null)
    },
  })

  if (!user) {
    return <PageLoader message={t('adminUsers.loadingAdmin')} />
  }

  const isMutating = createUserMutation.isPending ?? updateUserMutation.isPending ?? deleteUserMutation.isPending

  const handleRefreshUsers = () => {
    setActionError(null)
    setActionFeedback(null)
    refetchUsers()
  }

  const handleOpenCreate = () => {
    setActionError(null)
    setActionFeedback(null)
    createUserMutation.reset()
    setCreateOpen(true)
  }

  const handleCloseCreate = () => {
    createUserMutation.reset()
    setCreateOpen(false)
  }

  const handleOpenEdit = (record: AdminUserRecord) => {
    setActionError(null)
    setActionFeedback(null)
    updateUserMutation.reset()
    setEditingUser(record)
  }

  const handleCloseEdit = () => {
    updateUserMutation.reset()
    setEditingUser(null)
  }

  const handleCreate = (payload: CreateUserInput) => {
    setActionError(null)
    setActionFeedback(null)
    createUserMutation.mutate(payload)
  }

  const handleEdit = (userId: number, payload: EditUserInput) => {
    const password = payload.password?.trim() ? payload.password : undefined
    setActionError(null)
    setActionFeedback(null)

    const currentUser = users.find((candidate) => candidate.id === userId)
    const currentRoleName = currentUser?.roles[0]?.name ?? ''
    const nextRoleName = payload.role.trim()
    const shouldAssignRole = nextRoleName !== currentRoleName
    const roleId = roleNameToId.get(nextRoleName)
    if (typeof roleId !== 'number') {
      setActionError(t('adminUsers.errors.roleIdentify'))
      return
    }

    const isSuperuserUpdate = nextRoleName === 'admin' ? Boolean(payload.isSuperuser) : false

    updateUserMutation.mutate({
      userId,
      payload: {
        username: payload.username,
        email: payload.email,
        is_active: payload.isActive,
        password,
        is_superuser: isSuperuserUpdate,
      },
      roleId: shouldAssignRole ? roleId : undefined,
      roleName: shouldAssignRole ? nextRoleName : undefined,
    })
  }

  const handleToggleActive = (record: AdminUserRecord, nextActive: boolean) => {
    if (record.id === Number(user?.id)) {
      return
    }
    setActionError(null)
    setActionFeedback(null)
    updateUserMutation.mutate({
      userId: record.id,
      payload: {
        username: record.username,
        email: record.email,
        is_active: nextActive,
      },
    })
  }

  const handleRequestDelete = (record: AdminUserRecord) => {
    if (record.id === Number(user?.id)) {
      return
    }
    setActionError(null)
    setActionFeedback(null)
    setDeletingUser(record)
  }

  const handleConfirmDelete = () => {
    if (!deletingUser) {
      return
    }
    deleteUserMutation.mutate(deletingUser.id)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bsc-blue-medium dark:text-slate-300">
            {t('adminUsers.header.sectionLabel')}
          </p>
          <h1 className="text-3xl font-semibold text-bsc-blue-dark dark:text-white">{t('adminUsers.header.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {t('adminUsers.header.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefreshUsers} disabled={isFetchingUsers}>
            {isFetchingUsers ? t('adminUsers.actions.refreshing') : t('adminUsers.actions.refresh')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} disabled={isMutating}>
            {t('adminUsers.actions.newUser')}
          </Button>
        </div>
      </header>

      <UsersFilters state={filters} roleOptions={roleOptions} onChange={setFilters} />

      {actionFeedback && (
        <Alert
          variant={actionFeedback.variant === 'success' ? 'success' : 'danger'}
          title={actionFeedback.variant === 'success' ? t('adminUsers.alerts.successTitle') : t('adminUsers.alerts.errorTitle')}
          description={actionFeedback.message}
        />
      )}
      {actionError && <Alert variant="danger" title={t('adminUsers.alerts.actionFailedTitle')} description={actionError} />}
      {usersErrorMessage && (
        <Alert variant="danger" title={t('adminUsers.alerts.listLoadTitle')} description={usersErrorMessage} />
      )}

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-slate-400">
          <p>{t('adminUsers.summary.showing', { shown: filteredUsers.length, total: users.length })}</p>
        </div>

        {(() => {
          if (isLoadingUsers) {
            return <PageLoader fullscreen={false} message={t('adminUsers.loadingUsers')} />
          }
          if (filteredUsers.length === 0) {
            return (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-base font-semibold text-bsc-blue-dark dark:text-white">{t('adminUsers.empty.title')}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {t('adminUsers.empty.description')}
                </p>
              </div>
            )
          }
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-slate-700">
                <thead className="text-xs uppercase text-gray-500 dark:text-slate-400">
                  <tr className="bg-gray-50 dark:bg-slate-900/40">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t('adminUsers.table.user')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t('adminUsers.table.status')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t('adminUsers.table.roles')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t('adminUsers.table.updated')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t('adminUsers.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredUsers.map((record) => {
                  const isUpdatingThis = updateUserMutation.isPending && updateUserMutation.variables?.userId === record.id
                  
                  const isSelf = record.id === Number(user.id)
                  return (
                    <tr
                      key={record.id}
                      className="bg-white transition hover:bg-blue-50/40 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-bsc-blue-dark dark:text-slate-100">{record.username}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{record.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                          <Switch
                            checked={record.isActive}
                            onChange={(event) => handleToggleActive(record, event.target.checked)}
                            disabled={isUpdatingThis ?? isSelf}
                            aria-label={t('adminUsers.table.toggleActiveAria')}
                          />
                          <Badge variant={record.isActive ? 'success' : 'warning'} size="sm">
                            {record.isActive ? t('adminUsers.table.active') : t('adminUsers.table.inactive')}
                          </Badge>
                            {record.isSuperuser && record.roles[0]?.name === "admin" && (
                              <Badge variant="outline" size="sm">
                                {t('adminUsers.table.superuser')}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {record.roles.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {record.roles.slice(0, 3).map((role) => (
                                <Badge key={`${record.id}-role-${role.id}`} variant="info" size="sm" className="text-xs">
                                  {role.name}
                                </Badge>
                              ))}
                              {record.roles.length > 3 && (
                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                  {t('adminUsers.table.rolesMore', { count: record.roles.length - 3 })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-slate-400">{t('adminUsers.table.rolesNone')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                          {formatDateTime(record.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(record)} disabled={isMutating}>
                              {t('adminUsers.actions.edit')}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRequestDelete(record)}
                              disabled={isMutating ?? isSelf}
                            >
                              {t('adminUsers.actions.delete')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}
      </Card>

      <ConfirmDialog
        open={Boolean(deletingUser)}
        title={t('adminUsers.confirmDelete.title')}
        description={
          deletingUser ? t('adminUsers.confirmDelete.description', { username: deletingUser.username }) : undefined
        }
        confirmLabel={t('adminUsers.confirmDelete.confirm')}
        variant="danger"
        isConfirming={deleteUserMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingUser(null)}
      />

      <UserFormModal
        open={createOpen}
        mode="create"
        roleOptions={roleOptions}
        isSubmitting={createUserMutation.isPending}
        errorMessage={createUserMutation.error?.message ?? null}
        onClose={handleCloseCreate}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />

      <UserFormModal
        open={Boolean(editingUser)}
        mode="edit"
        user={editingUser}
        roleOptions={roleOptions}
        isSubmitting={updateUserMutation.isPending}
        errorMessage={updateUserMutation.error?.message ?? null}
        onClose={handleCloseEdit}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />
    </div>
  )
}
