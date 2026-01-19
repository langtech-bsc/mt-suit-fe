import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Card, ConfirmDialog, Input, PageLoader, Select, Switch } from '../../../components/ui'
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
  const { t } = useTranslation()
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
          lang.name.toLowerCase().includes(q) ??
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
      setFeedback({ variant: 'success', message: t('adminLanguages.feedback.created', { name: created.name }) })
    },
    onError: (err) => setFormError(err.message),
  })

  const updateMutation = useMutation<LanguageRecord, Error, { id: number; payload: LanguageUpsertInput }>({
    mutationFn: ({ id, payload }) => languageAdminService.update(id, payload),
    onSuccess: (updated) => {
      upsertLanguage(updated)
      queryClient.invalidateQueries({ queryKey: ['languages'] })
      setEditingLanguage(null)
      setFeedback({ variant: 'success', message: t('adminLanguages.feedback.updated', { name: updated.name }) })
    },
    onError: (err) => setFormError(err.message),
  })

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: (id) => languageAdminService.remove(id),
    onSuccess: () => {
      if (deletingLanguage) {
        removeLanguage(deletingLanguage.id)
        setFeedback({ variant: 'success', message: t('adminLanguages.feedback.deleted', { name: deletingLanguage.name }) })
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
      setFormError(t('adminLanguages.errors.duplicateIso', { iso }))
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
      setFormError(t('adminLanguages.errors.duplicateIso', { iso }))
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
        nativeName: lang.nativeName,
        isActive: next,
        sortOrder: lang.sortOrder,
      },
    })
  }

  const handleDelete = (lang: LanguageRecord) => {
    setDeletingLanguage(lang)
  }

  const isMutating = createMutation.isPending ?? updateMutation.isPending ?? deleteMutation.isPending

  if (isLoading) {
    return <PageLoader message={t('adminLanguages.loading')} />
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-bsc-blue-medium dark:text-slate-300">
            {t('adminLanguages.header.sectionLabel')}
          </p>
          <h1 className="text-3xl font-semibold text-bsc-blue-dark dark:text-white">{t('adminLanguages.header.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {t('adminLanguages.header.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? t('adminLanguages.actions.refreshing') : t('adminLanguages.actions.refresh')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} disabled={isMutating}>
            {t('adminLanguages.actions.addLanguage')}
          </Button>
        </div>
      </header>

      {feedback && (
        <Alert
          variant={feedback.variant === 'success' ? 'success' : 'danger'}
          title={feedback.variant === 'success' ? t('adminLanguages.feedback.successTitle') : t('adminLanguages.feedback.errorTitle')}
          description={feedback.message}
        />
      )}
      {error && <Alert variant="danger" title={t('adminLanguages.errors.loadTitle')} description={error.message} />}

      <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40 md:grid-cols-3">
        <div className="md:col-span-2">
          <Input
            label={t('adminLanguages.filters.searchLabel')}
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder={t('adminLanguages.filters.searchPlaceholder')}
          />
        </div>
        <Select
          label={t('adminLanguages.filters.statusLabel')}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          options={[
            { value: 'all', label: t('adminLanguages.filters.statusAll') },
            { value: 'active', label: t('adminLanguages.filters.statusActive') },
            { value: 'inactive', label: t('adminLanguages.filters.statusInactive') },
          ]}
        />
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-slate-400">
          <p>{t('adminLanguages.summary.showing', { shown: filteredLanguages.length, total: languages.length })}</p>
        </div>

        {filteredLanguages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-base font-semibold text-bsc-blue-dark dark:text-white">{t('adminLanguages.empty.title')}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t('adminLanguages.empty.description')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-slate-700">
              <thead className="text-xs uppercase text-gray-500 dark:text-slate-400">
                <tr className="bg-gray-50 dark:bg-slate-900/40">
                  <th className="px-4 py-3 font-semibold">{t('adminLanguages.table.name')}</th>
                  <th className="px-4 py-3 font-semibold">{t('adminLanguages.table.iso')}</th>
                  <th className="px-4 py-3 font-semibold">{t('adminLanguages.table.native')}</th>
                  <th className="px-4 py-3 font-semibold">{t('adminLanguages.table.active')}</th>
                  <th className="px-4 py-3 font-semibold">{t('adminLanguages.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredLanguages.map((lang) => {
                  const isUpdatingThis = updateMutation.isPending && updateMutation.variables?.id === lang.id
                  return (
                    <tr key={lang.id} className="bg-white transition hover:bg-blue-50/40 dark:bg-slate-900 dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-bsc-blue-dark dark:text-slate-100">{lang.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{t('adminLanguages.table.idLabel', { id: lang.id })}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-slate-200">{lang.isoCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                        {lang.nativeName ?? t('adminLanguages.table.nativeFallback')}
                      </td>
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
                            {t('adminLanguages.actions.edit')}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(lang)} disabled={isMutating ?? lang.id < 0}>
                            {t('adminLanguages.actions.delete')}
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
        title={t('adminLanguages.confirmDelete.title')}
        description={
          deletingLanguage
            ? t('adminLanguages.confirmDelete.description', { name: deletingLanguage.name, iso: deletingLanguage.isoCode })
            : undefined
        }
        confirmLabel={t('adminLanguages.confirmDelete.confirm')}
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
