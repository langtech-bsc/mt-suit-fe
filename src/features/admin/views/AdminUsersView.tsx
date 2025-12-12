import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, PageLoader } from '../../../components/ui'
import { useAuthStore } from '../../auth/store/auth.store'
import { adminUsersService } from '../services/adminUsers.service'
import type { AdminUserRecord } from '../types'


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

export const AdminUsersView = () => {
  const user = useAuthStore((state) => state.user)

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
    refetch: refetchUsers,
  } = useQuery<{ data: AdminUserRecord[]; skip: number; limit: number }, Error>({
    queryKey: ['admin-users', pagination],
    queryFn: () => adminUsersService.list(pagination),
    retry: 1,
    staleTime: 30_000,
  })

  const users = usersPayload?.data ?? []
  const usersErrorMessage = usersError?.message ?? null

  if (!user) {
    return <PageLoader message="Cargando consola de administración…" />
  }


  const handleRefreshUsers = () => {
    void refetchUsers()
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
         
          <h1 className="text-3xl font-semibold text-bsc-blue-dark dark:text-white">Panel de usuarios y roles</h1>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Controla el acceso a los módulos de BSC Translation y deja trazabilidad de cada cambio.
          </p>
        </div>
       
      </header>


      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-bsc-blue-dark dark:text-white">Usuarios y permisos</h2>
           
          </div>
           <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRefreshUsers} disabled={isLoadingUsers}>
              {isLoadingUsers ? 'Actualizando…' : 'Refrescar usuarios'}
            </Button>
            <Button variant="primary" size="sm" disabled title="Próximamente">
              Nuevo usuario
            </Button>
          </div>
        </div>
        <Card padding="lg" className="space-y-4">
          {usersErrorMessage && (
            <Alert variant="danger" title="No pudimos obtener la lista" description={usersErrorMessage}>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={handleRefreshUsers}>
                  Reintentar
                </Button>
              </div>
            </Alert>
          )}
          {!usersErrorMessage && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-slate-400">
              <p>
                Mostrando <span className="font-semibold text-bsc-blue-dark dark:text-slate-100">{users.length}</span> usuarios
              </p>
             
            </div>
          )}

          {(() => {
            if (isLoadingUsers) {
              return <PageLoader fullscreen={false} message="Cargando usuarios…" />;
            }
            if (users.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-base font-semibold text-bsc-blue-dark dark:text-white">Sin usuarios disponibles</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    Cuando se registren cuentas en el backend aparecerán aquí automáticamente.
                  </p>
                </div>
              );
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {users.map((record) => (
                      <tr key={record.id} className="bg-white transition hover:bg-blue-50/40 dark:bg-slate-900 dark:hover:bg-slate-800">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-bsc-blue-dark dark:text-slate-100">{record.username}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{record.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
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
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{formatDateTime(record.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </Card>
      </section>
    </div>
  )
}
