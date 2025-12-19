import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, PageLoader, Switch } from '../../../components/ui'
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

  const [filters, setFilters] = useState<UsersFiltersState>({
    query: '',
    status: 'all',
    role: 'all',
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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

  const createUserMutation = useMutation<AdminUserRecord, Error, CreateUserInput>({
    mutationFn: async (payload) => {
      const { role, ...createPayload } = payload
      const created = await adminUsersService.create(createPayload)

      const roleName = role.trim()
      const roleId = roleNameToId.get(roleName)
      if (typeof roleId !== 'number') {
        throw new Error('No pudimos identificar el rol seleccionado. Refresca la lista de roles e inténtalo de nuevo.')
      }
      await adminRolesService.assignRole({ userId: created.id, roleId })

      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setCreateOpen(false)
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  if (!user) {
    return <PageLoader message="Cargando consola de administración…" />
  }

  const isMutating = createUserMutation.isPending ?? updateUserMutation.isPending

  const handleRefreshUsers = () => {
    setActionError(null)
    refetchUsers()
  }

  const handleOpenCreate = () => {
    setActionError(null)
    createUserMutation.reset()
    setCreateOpen(true)
  }

  const handleCloseCreate = () => {
    createUserMutation.reset()
    setCreateOpen(false)
  }

  const handleOpenEdit = (record: AdminUserRecord) => {
    setActionError(null)
    updateUserMutation.reset()
    setEditingUser(record)
  }

  const handleCloseEdit = () => {
    updateUserMutation.reset()
    setEditingUser(null)
  }

  const handleCreate = (payload: CreateUserInput) => {
    setActionError(null)
    createUserMutation.mutate(payload)
  }

  const handleEdit = (userId: number, payload: EditUserInput) => {
    const password = payload.password?.trim() ? payload.password : undefined
    setActionError(null)

    const currentUser = users.find((candidate) => candidate.id === userId)
    const currentRoleName = currentUser?.roles[0]?.name ?? ''
    const nextRoleName = payload.role.trim()
    const shouldAssignRole = nextRoleName !== currentRoleName
    const roleId = roleNameToId.get(nextRoleName)
    if (typeof roleId !== 'number') {
      setActionError('No pudimos identificar el rol seleccionado. Refresca la lista de roles e inténtalo de nuevo.')
      return
    }

    const isSuperuserUpdate = nextRoleName === 'admin' ? Boolean(payload.isSuperuser) : undefined

    updateUserMutation.mutate({
      userId,
      payload: {
        username: payload.username,
        email: payload.email,
        is_active: payload.isActive,
        password,
        ...(typeof isSuperuserUpdate === 'boolean' ? { is_superuser: isSuperuserUpdate } : {}),
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
    updateUserMutation.mutate({
      userId: record.id,
      payload: {
        username: record.username,
        email: record.email,
        is_active: nextActive,
      },
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bsc-blue-medium dark:text-slate-300">
            Governance
          </p>
          <h1 className="text-3xl font-semibold text-bsc-blue-dark dark:text-white">Usuarios y roles</h1>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Filtra, crea y actualiza usuarios. Los cambios de estado se aplican al instante.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefreshUsers} disabled={isFetchingUsers}>
            {isFetchingUsers ? 'Actualizando…' : 'Refrescar'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} disabled={isMutating}>
            Nuevo usuario
          </Button>
        </div>
      </header>

      <UsersFilters state={filters} roleOptions={roleOptions} onChange={setFilters} />

      {actionError && <Alert variant="danger" title="Acción fallida" description={actionError} />}
      {usersErrorMessage && (
        <Alert variant="danger" title="No pudimos obtener la lista" description={usersErrorMessage} />
      )}

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-slate-400">
          <p>
            Mostrando{' '}
            <span className="font-semibold text-bsc-blue-dark dark:text-slate-100">{filteredUsers.length}</span> de{' '}
            <span className="font-semibold text-bsc-blue-dark dark:text-slate-100">{users.length}</span>
          </p>
        </div>

        {(() => {
          if (isLoadingUsers) {
            return <PageLoader fullscreen={false} message="Cargando usuarios…" />
          }
          if (filteredUsers.length === 0) {
            return (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-base font-semibold text-bsc-blue-dark dark:text-white">Sin resultados</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Ajusta filtros o crea un nuevo usuario para comenzar.
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
                      Usuario
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Roles
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Actualizado
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Acciones
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
                            aria-label="Activar o desactivar usuario"
                          />
                            <Badge variant={record.isActive ? 'success' : 'warning'} size="sm">
                              {record.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                            {record.isSuperuser && (
                              <Badge variant="outline" size="sm">
                                Superuser
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
                                  +{record.roles.length - 3} más
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-slate-400">Sin roles</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                          {formatDateTime(record.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(record)} disabled={isMutating}>
                            Editar
                          </Button>
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
