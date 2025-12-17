import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, ConfirmDialog, PageLoader, Switch } from '../../../components/ui'
import { providerAdminService } from '../../providers/services/providerAdmin.service'
import type { ProviderCreateInput, ProviderRecord, ProviderUpdateInput } from '../../providers/types'
import { ProviderFormModal } from '../../providers/components/ProviderFormModal'

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

export const AdminProvidersView = () => {
  const queryClient = useQueryClient()

  const pagination = useMemo(
    () => ({
      skip: 0,
      limit: 100,
    }),
    [],
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderRecord | null>(null)
  const [deletingProvider, setDeletingProvider] = useState<ProviderRecord | null>(null)
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'danger'; message: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: providersPayload,
    error: providersError,
    isLoading: isLoadingProviders,
    isFetching: isFetchingProviders,
    refetch: refetchProviders,
  } = useQuery<{ data: ProviderRecord[]; skip: number; limit: number }, Error>({
    queryKey: ['admin-providers', pagination],
    queryFn: () => providerAdminService.list(pagination),
    retry: 1,
    staleTime: 30_000,
  })

  const providers = useMemo(() => providersPayload?.data ?? [], [providersPayload])

  const upsertCachedProvider = (updated: ProviderRecord) => {
    queryClient.setQueriesData<{ data: ProviderRecord[]; skip: number; limit: number }>(
      { queryKey: ['admin-providers'] },
      (previous) => {
        if (!previous) {
          return previous
        }
        const exists = previous.data.some((record) => record.id === updated.id)
        const nextData = exists
          ? previous.data.map((record) => (record.id === updated.id ? updated : record))
          : [updated, ...previous.data]
        return { ...previous, data: nextData }
      },
    )
  }

  const removeCachedProvider = (providerId: number) => {
    queryClient.setQueriesData<{ data: ProviderRecord[]; skip: number; limit: number }>(
      { queryKey: ['admin-providers'] },
      (previous) => {
        if (!previous) {
          return previous
        }
        return { ...previous, data: previous.data.filter((record) => record.id !== providerId) }
      },
    )
  }

  const createMutation = useMutation<ProviderRecord, Error, ProviderCreateInput>({
    mutationFn: (payload) => providerAdminService.create(payload),
    onSuccess: (created) => {
      upsertCachedProvider(created)
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] })
      setCreateOpen(false)
      setFeedback({ variant: 'success', message: `Proveedor "${created.name}" creado.` })
    },
    onError: (err) => setFormError(err.message),
  })

  const updateMutation = useMutation<
    ProviderRecord,
    Error,
    { providerId: number; payload: ProviderUpdateInput; successMessage?: string }
  >({
    mutationFn: ({ providerId, payload }) => providerAdminService.update(providerId, payload),
    onSuccess: (updated, variables) => {
      upsertCachedProvider(updated)
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] })
      setEditingProvider(null)
      if (variables.successMessage) {
        setFeedback({ variant: 'success', message: variables.successMessage })
      } else {
        setFeedback({ variant: 'success', message: `Proveedor "${updated.name}" actualizado.` })
      }
    },
    onError: (err) => setFormError(err.message),
  })

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: (providerId) => providerAdminService.remove(providerId),
    onSuccess: (_, providerId) => {
      removeCachedProvider(providerId)
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] })
      if (deletingProvider) {
        setFeedback({ variant: 'success', message: `Proveedor "${deletingProvider.name}" eliminado.` })
      }
      setDeletingProvider(null)
    },
    onError: (err) => {
      setFeedback({ variant: 'danger', message: err.message })
      setDeletingProvider(null)
    },
  })

  const handleOpenCreate = () => {
    setFormError(null)
    createMutation.reset()
    setCreateOpen(true)
  }

  const handleCloseCreate = () => {
    createMutation.reset()
    setCreateOpen(false)
  }

  const handleOpenEdit = (provider: ProviderRecord) => {
    setFormError(null)
    updateMutation.reset()
    setEditingProvider(provider)
  }

  const handleCloseEdit = () => {
    updateMutation.reset()
    setEditingProvider(null)
  }

  const handleCreate = (payload: ProviderCreateInput) => {
    setFormError(null)
    createMutation.mutate(payload)
  }

  const handleEdit = (providerId: number, payload: ProviderUpdateInput) => {
    setFormError(null)
    updateMutation.mutate({ providerId, payload })
  }

  const handleToggleActive = (record: ProviderRecord, nextActive: boolean) => {
    setFeedback(null)
    setFormError(null)
    updateMutation.mutate({
      providerId: record.id,
      payload: {
        name: record.name,
        endpoint: record.endpoint,
        region: record.region,
        configuration: record.configuration,
        isActive: nextActive,
        isDefault: record.isDefault,
        inputLanguageIds: record.inputLanguageIds,
        outputLanguageIds: record.outputLanguageIds,
      },
      successMessage: nextActive ? `Proveedor "${record.name}" activado.` : `Proveedor "${record.name}" deshabilitado.`,
    })
  }

  const handleToggleDefault = (record: ProviderRecord, nextDefault: boolean) => {
    setFeedback(null)
    setFormError(null)
    updateMutation.mutate({
      providerId: record.id,
      payload: {
        name: record.name,
        endpoint: record.endpoint,
        region: record.region,
        configuration: record.configuration,
        isActive: record.isActive,
        isDefault: nextDefault,
        inputLanguageIds: record.inputLanguageIds,
        outputLanguageIds: record.outputLanguageIds,
      },
      successMessage: nextDefault ? `Proveedor "${record.name}" marcado como default.` : `Proveedor "${record.name}" dejó de ser default.`,
    })
  }

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  if (isLoadingProviders) {
    return <PageLoader message="Cargando proveedores…" />
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bsc-blue-dark dark:text-white">Providers</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Administra proveedores de traducción. Datos: skip {providersPayload?.skip ?? pagination.skip}, limit {providersPayload?.limit ?? pagination.limit}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => refetchProviders()} disabled={isFetchingProviders}>
            {isFetchingProviders ? 'Sincronizando…' : 'Refrescar'}
          </Button>
          <Button variant="primary" onClick={handleOpenCreate} disabled={isMutating}>
            Añadir provider
          </Button>
        </div>
      </div>

      {providersError?.message && (
        <Alert
          variant="danger"
          title="No pudimos cargar los proveedores"
          description={providersError.message}
          actions={
            <Button variant="outline" size="sm" onClick={() => refetchProviders()} disabled={isFetchingProviders}>
              Reintentar
            </Button>
          }
        />
      )}

      {feedback && <Alert variant={feedback.variant} title={feedback.variant === 'success' ? 'Listo' : 'Atención'} description={feedback.message} />}
      {formError && <Alert variant="danger" title="No pudimos completar la acción" description={formError} />}

      <Card className="space-y-4">
        {providers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-slate-300">No hay proveedores registrados.</p>
            <div className="mt-4">
              <Button variant="primary" onClick={handleOpenCreate}>
                Crear primer provider
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-slate-700">
              <thead className="text-xs uppercase text-gray-500 dark:text-slate-400">
                <tr className="bg-gray-50 dark:bg-slate-900/40">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Nombre
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Default
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
                {providers.map((record) => {
                  const isUpdatingThis = updateMutation.isPending && updateMutation.variables?.providerId === record.id

                  return (
                    <tr key={record.id} className="bg-white transition hover:bg-blue-50/40 dark:bg-slate-900 dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-bsc-blue-dark dark:text-slate-100">{record.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">ID: {record.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Switch
                            checked={record.isActive}
                            onChange={(event) => handleToggleActive(record, event.target.checked)}
                            disabled={isUpdatingThis || isMutating}
                            aria-label="Activar o desactivar provider"
                          />
                          <Badge variant={record.isActive ? 'success' : 'warning'} size="sm">
                            {record.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Switch
                            checked={record.isDefault}
                            onChange={(event) => handleToggleDefault(record, event.target.checked)}
                            disabled={isUpdatingThis || isMutating}
                            aria-label="Marcar provider como default"
                          />
                          {record.isDefault ? (
                            <Badge variant="info" size="sm">
                              Default
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{formatDateTime(record.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(record)} disabled={isMutating}>
                            Editar
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setDeletingProvider(record)} disabled={isMutating}>
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ProviderFormModal
        open={createOpen}
        mode="create"
        isSubmitting={createMutation.isPending}
        errorMessage={createMutation.error?.message ?? null}
        onClose={handleCloseCreate}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />

      <ProviderFormModal
        open={Boolean(editingProvider)}
        mode="edit"
        provider={editingProvider}
        isSubmitting={updateMutation.isPending}
        errorMessage={updateMutation.error?.message ?? null}
        onClose={handleCloseEdit}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />

      <ConfirmDialog
        open={Boolean(deletingProvider)}
        title="Eliminar provider"
        description={
          deletingProvider ? `Esto eliminará el provider "${deletingProvider.name}". Esta acción no se puede deshacer.` : undefined
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onClose={() => setDeletingProvider(null)}
        onConfirm={() => {
          if (!deletingProvider) {
            return
          }
          deleteMutation.mutate(deletingProvider.id)
        }}
        isConfirming={deleteMutation.isPending}
      />
    </div>
  )
}
