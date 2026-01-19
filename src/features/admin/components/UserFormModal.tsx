/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Checkbox, Input, Modal, Select, Switch } from '../../../components/ui'
import type { AdminUserRecord } from '../types'
import { useAuthStore } from '../../auth/store/auth.store'

type Mode = 'create' | 'edit'

export type CreateUserInput = {
  username: string
  email: string
  password: string
  role: string
}

export type EditUserInput = {
  username: string
  email: string
  password?: string
  isActive: boolean
  role: string
  isSuperuser?: boolean
}

interface UserFormModalProps {
  open: boolean
  mode: Mode
  user?: AdminUserRecord | null
  roleOptions: string[]
  isSubmitting: boolean
  errorMessage: string | null
  onClose: () => void
  onCreate: (payload: CreateUserInput) => void
  onEdit: (userId: number, payload: EditUserInput) => void
}

export const UserFormModal = ({
  open,
  mode,
  user,
  roleOptions,
  isSubmitting,
  errorMessage,
  onClose,
  onCreate,
  onEdit,
}: UserFormModalProps) => {
  const { t } = useTranslation()
  const isEdit = mode === 'edit'

  const currentUserLogged = useAuthStore((state) => state.user)
  const hasRoleOptions = roleOptions.length > 0
  const createRoleFallback = roleOptions[0] ?? ''

  const itself = useMemo(() => {
    if (!isEdit || !user || !currentUserLogged) {
      return false
    }
    return user.id === Number(currentUserLogged.id)
  }, [isEdit, user, currentUserLogged])
  const defaultEditRole = useMemo(() => {
    if (!user) {
      return roleOptions[0] ?? ''
    }
    const candidate = user.roles[0]?.name
    if (!candidate) {
      return roleOptions[0] ?? ''
    }
    return roleOptions.includes(candidate) ? candidate : (roleOptions[0] ?? '')
  }, [user, roleOptions])

  const createSchema = useMemo(
    () =>
      z.object({
        username: z.string().min(1, t('userFormModal.validation.usernameRequired')),
        email: z.email(t('userFormModal.validation.emailInvalid')),
        password: z.string().min(6, t('userFormModal.validation.passwordMin')),
        role: z
          .string()
          .min(1, t('userFormModal.validation.roleRequired'))
          .refine((value) => value !== 'all', t('userFormModal.validation.roleRequired')),
      }),
    [t],
  )

  const editSchema = useMemo(
    () =>
      z.object({
        username: z.string().min(1, t('userFormModal.validation.usernameRequired')),
        email: z.email(t('userFormModal.validation.emailInvalid')),
        password: z.string().optional(),
        isActive: z.boolean(),
        role: z.string().min(1, t('userFormModal.validation.roleRequired')),
        isSuperuser: z.boolean().optional(),
      }),
    [t],
  )

  const createForm = useForm<CreateUserInput>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role: createRoleFallback,
    },
  })

  const editForm = useForm<EditUserInput>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      isActive: true,
      role: createRoleFallback,
      isSuperuser: false,
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (isEdit) {
      editForm.reset({
        username: user?.username ?? '',
        email: user?.email ?? '',
        password: '',
        isActive: Boolean(user?.isActive),
        role: defaultEditRole,
        isSuperuser: Boolean(user?.isSuperuser),
      })
      return
    }

    createForm.reset({
      username: '',
      email: '',
      password: '',
      role: createRoleFallback,
    })
  }, [createForm, createRoleFallback, defaultEditRole, editForm, isEdit, open, user])

  const watchedEditRole = editForm.watch('role')

  useEffect(() => {
    if (!open || !isEdit) {
      return
    }

    if (watchedEditRole === 'admin') {
      return
    }

    if (editForm.getValues('isSuperuser')) {
      editForm.setValue('isSuperuser', false, { shouldDirty: true, shouldValidate: true })
    }
  }, [editForm, isEdit, open, watchedEditRole])

  const handleSubmitCreate = createForm.handleSubmit((values) => {
    const validation = createSchema.safeParse(values)
    if (!validation.success) {
      const first = validation.error.issues[0]
      if (first?.path?.[0] && typeof first.path[0] === 'string') {
        createForm.setError(first.path[0] as keyof CreateUserInput, { type: 'manual', message: first.message })
      }
      return
    }
    onCreate(validation.data)
  })

  const handleSubmitEdit = editForm.handleSubmit((values) => {
    if (!user) {
      return
    }
    const validation = editSchema.safeParse(values)
    if (!validation.success) {
      const first = validation.error.issues[0]
      if (first?.path?.[0] && typeof first.path[0] === 'string') {
        editForm.setError(first.path[0] as keyof EditUserInput, { type: 'manual', message: first.message })
      }
      return
    }
    onEdit(user.id, validation.data)
  })

  let buttonText = t('userFormModal.buttons.create')
  if (isSubmitting) {
    buttonText = t('userFormModal.buttons.saving')
  } else if (isEdit) {
    buttonText = t('userFormModal.buttons.saveChanges')
  }

  const isCreateDisabled = !isEdit && !hasRoleOptions
  const isEditDisabled = isEdit && !hasRoleOptions

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        {t('userFormModal.buttons.cancel')}
      </Button>
      <Button
        variant="primary"
        onClick={isEdit ? handleSubmitEdit : handleSubmitCreate}
        disabled={isSubmitting || isCreateDisabled || isEditDisabled}
      >
        {buttonText}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('userFormModal.titleEdit') : t('userFormModal.titleCreate')}
      description={isEdit ? t('userFormModal.descriptionEdit') : t('userFormModal.descriptionCreate')}
      footer={footer}
    >
      {errorMessage && (
        <Alert variant="danger" title={t('userFormModal.actionErrorTitle')} description={errorMessage} />
      )}
      {!isEdit && !hasRoleOptions && (
        <Alert
          variant="warning"
          title={t('userFormModal.noRolesTitle')}
          description={t('userFormModal.noRolesCreateDescription')}
        />
      )}
      {isEdit && !hasRoleOptions && (
        <Alert
          variant="warning"
          title={t('userFormModal.noRolesTitle')}
          description={t('userFormModal.noRolesEditDescription')}
        />
      )}

      {!isEdit ? (
        <form className="mt-4 space-y-4" onSubmit={handleSubmitCreate}>
          <input
            type="hidden"
            {...createForm.register('role', {
              validate: (value) => createSchema.shape.role.safeParse(value).success || t('userFormModal.validation.roleRequired'),
            })}
          />
          <Input
            label={t('userFormModal.fields.usernameLabel')}
            placeholder={t('userFormModal.fields.usernamePlaceholder')}
            disabled={isSubmitting}
            {...createForm.register('username', {
              validate: (value) =>
                createSchema.shape.username.safeParse(value).success || t('userFormModal.validation.usernameRequired'),
            })}
            error={createForm.formState.errors.username?.message}
          />
          <Input
            label={t('userFormModal.fields.emailLabel')}
            type="email"
            placeholder={t('userFormModal.fields.emailPlaceholder')}
            disabled={isSubmitting}
            {...createForm.register('email', {
              validate: (value) => createSchema.shape.email.safeParse(value).success || t('userFormModal.validation.emailInvalid'),
            })}
            error={createForm.formState.errors.email?.message}
          />
          <Input
            label={t('userFormModal.fields.passwordLabel')}
            type="password"
            placeholder={t('userFormModal.fields.passwordPlaceholder')}
            disabled={isSubmitting}
            {...createForm.register('password', {
              validate: (value) =>
                createSchema.shape.password.safeParse(value).success || t('userFormModal.validation.passwordMin'),
            })}
            error={createForm.formState.errors.password?.message}
          />
          <div className="w-full sm:w-64">
            <Select
              label={t('userFormModal.fields.roleLabel')}
              value={createForm.watch('role') ?? ''}
              onChange={(event) =>
                createForm.setValue('role', event.target.value, { shouldDirty: true, shouldValidate: true })
              }
              disabled={isSubmitting || !hasRoleOptions}
              helperText={t('userFormModal.fields.roleCreateHelper')}
              options={[
                ...roleOptions.map((value) => ({ value, label: value })),
              ]}
            />
            {createForm.formState.errors.role?.message && (
              <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.role.message}</p>
            )}
          </div>
        </form>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmitEdit}>
          <input
            type="hidden"
            {...editForm.register('role', {
              validate: (value) => editSchema.shape.role.safeParse(value).success || t('userFormModal.validation.roleRequired'),
            })}
          />
          <Input
            label={t('userFormModal.fields.usernameLabel')}
            disabled={isSubmitting}
            {...editForm.register('username', {
              validate: (value) =>
                editSchema.shape.username.safeParse(value).success || t('userFormModal.validation.usernameRequired'),
            })}
            error={editForm.formState.errors.username?.message}
          />
          <Input
            label={t('userFormModal.fields.emailLabel')}
            type="email"
            disabled={isSubmitting}
            {...editForm.register('email', {
              validate: (value) => editSchema.shape.email.safeParse(value).success || t('userFormModal.validation.emailInvalid'),
            })}
            error={editForm.formState.errors.email?.message}
          />
          <Input
            label={t('userFormModal.fields.newPasswordLabel')}
            type="password"
            placeholder={t('userFormModal.fields.newPasswordPlaceholder')}
            disabled={isSubmitting}
            {...editForm.register('password', { validate: () => true })}
            error={editForm.formState.errors.password?.message}
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Switch
              label={editForm.watch('isActive') ? t('userFormModal.switches.active') : t('userFormModal.switches.inactive')}
              checked={editForm.watch('isActive')}
              onChange={(event) =>
                editForm.setValue('isActive', event.target.checked, { shouldDirty: true, shouldValidate: true })
              }
              disabled={isSubmitting || itself}
            />
            <div className="w-full sm:w-64">
              <Select
                label={t('userFormModal.fields.roleLabel')}
                value={editForm.watch('role') ?? ''}
                onChange={(event) =>
                  editForm.setValue('role', event.target.value, { shouldDirty: true, shouldValidate: true })
                }
                disabled={isSubmitting || !hasRoleOptions}
                helperText={t('userFormModal.fields.roleEditHelper')}
                options={[
                  ...roleOptions.map((value) => ({ value, label: value })),
                ]}
              />
              {editForm.formState.errors.role?.message && (
                <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.role.message}</p>
              )}
            </div>
          </div>

          {editForm.watch('role') === 'admin' && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <Checkbox
                checked={Boolean(editForm.watch('isSuperuser'))}
                onChange={(event) =>
                  editForm.setValue('isSuperuser', event.target.checked, { shouldDirty: true, shouldValidate: true })
                }
                disabled={isSubmitting}
                label={t('userFormModal.superuser.label')}
                helperText={t('userFormModal.superuser.helper')}
              />
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}
