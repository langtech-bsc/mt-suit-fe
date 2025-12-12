import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, ConfirmDialog, Input, PageLoader, Select, Switch } from '../../../components/ui'
import { useLanguagesQuery } from '../../languages/queries/useLanguagesQuery'
import { useLanguagesStore } from '../../languages/store/languages.store'
import { languageAdminService } from '../../languages/services/languageAdmin.service'
import type { LanguageRecord, LanguageUpsertInput } from '../../languages/types'
import { LanguageFormModal } from '../../languages/components/LanguageFormModal'

type StatusFilter = 'all' | 'active' | 'inactive'

const normalize = (value: string) => value.trim().toLowerCase()

const formatIso = (value: string) => value.trim()

export const AdminLanguagesView = () => {
  const queryClient = useQueryClient()
  const { isLoading, isFetching, error, refetch } = useLanguagesQuery()
  const languages = useLanguagesStore((state) => state.languages)
  const upsertLanguage = useLanguagesStore((state) => state.upsertLanguage)
  const removeLanguage = useLanguagesStore((state) => state.removeLanguage)

  const [filterQuery, setFilterQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingLanguage, setEditingLanguage] = useState<LanguageRecord | null>(null)
  const [deletingLanguage, setDeletingLanguage] = useState<LanguageRecord | null>(null)
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'danger'; message: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const filteredLanguages = useMemo(() => {
    const q = normalize(filterQuery)
    return languages
      .filter((lang) => {
        if (statusFilter === 'active' && !lang.isActive) {
          return false
        }
        if (statusFilter === 'inactive' && lang.isActive) {
          return false
        }
        if (!q) {
          return true
        }
        return (
          lang.name.toLowerCase().includes(q) ||
          lang.isoCode.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [languages, filterQuery, statusFilter])

  const hasDuplicateIso = (isoCode: string, ignoreId?: number) => {
    const code = normalize(isoCode)
    return languages.some((lang) => lang.id !== ignoreId && normalize(lang.isoCode) === code)
  }

  const createMutation = useMutation<LanguageRecord, Error, LanguageUpsertInput>({
    mutationFn: (payload) => languageAdminService.create(payload),
    onSuccess: (created) => {
      upsertLanguage(created)
      queryClient.invalidateQueries({ queryKey: ['languages'] })
      setCreateOpen(false)
      setFeedback({ variant: 'success', message: `Idioma "${created.name}" añadido.` })
    },
    onError: (err) => setFormError(err.message),
  })

  const updateMutation = useMutation<LanguageRecord, Error, { id: number; payload: LanguageUpsertInput }>({
    mutationFn: ({ id, payload }) => languageAdminService.update(id, payload),
    onSuccess: (updated) => {
      upsertLanguage(updated)
      queryClient.invalidateQueries({ queryKey: ['languages'] })
      setEditingLanguage(null)
      setFeedback({ variant: 'success', message: `Idioma "${updated.name}" actualizado.` })
    },
    onError: (err) => setFormError(err.message),
  })

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: (id) => languageAdminService.remove(id),
    onSuccess: () => {
      if (deletingLanguage) {
        removeLanguage(deletingLanguage.id)
        setFeedback({ variant: 'success', message: `Idioma "${deletingLanguage.name}" eliminado.` })
      }
      queryClient.invalidateQueries({ queryKey: ['languages'] })
      setDeletingLanguage(null)
    },
    onError: (err) => {
      setFeedback({ variant: 'danger', message: err.message })
      setDeletingLanguage(null)
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

  const handleOpenEdit = (lang: LanguageRecord) => {
    setFormError(null)
    updateMutation.reset()
    setEditingLanguage(lang)
  }

  const handleCloseEdit = () => {
    updateMutation.reset()
    setEditingLanguage(null)
  }

  const handleSubmitCreate = (payload: LanguageUpsertInput) => {
    const iso = formatIso(payload.isoCode)
    if (hasDuplicateIso(iso)) {
      setFormError(`El código ISO "${iso}" ya existe.`)
      return
    }
    setFormError(null)
    createMutation.mutate({ ...payload, isoCode: iso })
  }

  const handleSubmitEdit = (payload: LanguageUpsertInput) => {
    if (!editingLanguage) {
      return
    }
    const iso = formatIso(payload.isoCode)
    if (hasDuplicateIso(iso, editingLanguage.id)) {
      setFormError(`El código ISO "${iso}" ya existe.`)
      return
    }
    setFormError(null)
    updateMutation.mutate({ id: editingLanguage.id, payload: { ...payload, isoCode: iso } })
  }

  const handleToggleActive = (lang: LanguageRecord, next: boolean) => {
    setFormError(null)
    updateMutation.mutate({
      id: lang.id,
      payload: {
        name: lang.name,
        isoCode: lang.isoCode,
        flagUrl: lang.flagUrl,
        isActive: next,
      },
    })
  }

  const handleDelete = (lang: LanguageRecord) => {
    setDeletingLanguage(lang)
  }

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  if (isLoading) {
    return <PageLoader message="Cargando idiomas…" />
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bsc-blue-medium dark:text-slate-300">
            Administración
          </p>
          <h1 className="text-3xl font-semibold text-bsc-blue-dark dark:text-white">Gestión de Idiomas</h1>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Añade, edita y deshabilita idiomas. Los selectores se actualizan en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Actualizando…' : 'Refrescar'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} disabled={isMutating}>
            Añadir idioma
          </Button>
        </div>
      </header>

      {feedback && (
        <Alert
          variant={feedback.variant === 'success' ? 'success' : 'danger'}
          title={feedback.variant === 'success' ? 'Listo' : 'Error'}
          description={feedback.message}
        />
      )}
      {error && <Alert variant="danger" title="No pudimos cargar idiomas" description={error.message} />}

      <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40 md:grid-cols-3">
        <div className="md:col-span-2">
          <Input
            label="Buscar"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="Filtrar por nombre o ISO…"
          />
        </div>
        <Select
          label="Estado"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Activos' },
            { value: 'inactive', label: 'Inactivos' },
          ]}
        />
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-slate-400">
          <p>
            Mostrando <span className="font-semibold text-bsc-blue-dark dark:text-slate-100">{filteredLanguages.length}</span> de{' '}
            <span className="font-semibold text-bsc-blue-dark dark:text-slate-100">{languages.length}</span>
          </p>
          <Badge variant="outline" size="sm">
            GET /languages
          </Badge>
        </div>

        {filteredLanguages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-base font-semibold text-bsc-blue-dark dark:text-white">Sin idiomas</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Añade un idioma para que aparezca en los selectores.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-slate-700">
              <thead className="text-xs uppercase text-gray-500 dark:text-slate-400">
                <tr className="bg-gray-50 dark:bg-slate-900/40">
                  <th className="px-4 py-3 font-semibold">Bandera</th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">ISO</th>
                  <th className="px-4 py-3 font-semibold">Activo</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredLanguages.map((lang) => {
                  const isUpdatingThis = updateMutation.isPending && updateMutation.variables?.id === lang.id
                  return (
                    <tr key={lang.id} className="bg-white transition hover:bg-blue-50/40 dark:bg-slate-900 dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        {lang.flagUrl ? (
                          <img
                            src={lang.flagUrl}
                            alt={`Bandera ${lang.name}`}
                            className="h-8 w-12 rounded-lg border border-gray-200 object-cover dark:border-slate-700"
                          />
                        ) : (
                          <div className="flex h-8 w-12 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 dark:border-slate-700 dark:text-slate-500">
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-bsc-blue-dark dark:text-slate-100">{lang.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">ID {lang.id}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-slate-200">{lang.isoCode}</td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={lang.isActive}
                          onChange={(event) => handleToggleActive(lang, event.target.checked)}
                          disabled={isUpdatingThis}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(lang)} disabled={isMutating}>
                            Editar
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(lang)} disabled={isMutating || lang.id < 0}>
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

      <LanguageFormModal
        open={createOpen}
        mode="create"
        isSubmitting={createMutation.isPending}
        errorMessage={formError ?? createMutation.error?.message ?? null}
        onClose={handleCloseCreate}
        onSubmit={handleSubmitCreate}
      />

      <LanguageFormModal
        open={Boolean(editingLanguage)}
        mode="edit"
        language={editingLanguage}
        isSubmitting={updateMutation.isPending}
        errorMessage={formError ?? updateMutation.error?.message ?? null}
        onClose={handleCloseEdit}
        onSubmit={handleSubmitEdit}
      />

      <ConfirmDialog
        open={Boolean(deletingLanguage)}
        title="Eliminar idioma"
        description={
          deletingLanguage
            ? `Se eliminará "${deletingLanguage.name}" (${deletingLanguage.isoCode}). Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        variant="danger"
        isConfirming={deleteMutation.isPending}
        onClose={() => setDeletingLanguage(null)}
        onConfirm={() => {
          if (deletingLanguage) {
            deleteMutation.mutate(deletingLanguage.id)
          }
        }}
      />
    </div>
  )
}
