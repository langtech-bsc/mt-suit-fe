/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, Button, Checkbox, Input, Modal, Select, Switch } from '../../../components/ui'
import type { AdminUserRecord } from '../types'
import { useAuthStore } from '../../auth/store/auth.store'

type Mode = 'create' | 'edit'

const createSchema = z.object({
  username: z.string().min(1, 'El usuario es obligatorio.'),
  email: z.email('Ingresa un email válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  role: z
    .string()
    .min(1, 'Selecciona un rol.')
    .refine((value) => value !== 'all', 'Selecciona un rol.'),
})

const editSchema = z.object({
  username: z.string().min(1, 'El usuario es obligatorio.'),
  email: z.email('Ingresa un email válido.'),
  password: z.string().optional(),
  isActive: z.boolean(),
  role: z.string().min(1, 'Selecciona un rol.'),
  isSuperuser: z.boolean().optional(),
})

export type CreateUserInput = z.infer<typeof createSchema>
export type EditUserInput = z.infer<typeof editSchema>

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

  let buttonText = 'Crear usuario'
  if (isSubmitting) {
    buttonText = 'Guardando…'
  } else if (isEdit) {
    buttonText = 'Guardar cambios'
  }

  const isCreateDisabled = !isEdit && !hasRoleOptions
  const isEditDisabled = isEdit && !hasRoleOptions

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancelar
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
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      description={isEdit ? 'Actualiza datos básicos y estado de la cuenta.' : 'Crea una cuenta con credenciales iniciales.'}
      footer={footer}
    >
      {errorMessage && <Alert variant="danger" title={"No pudimos completar la acción"} description={errorMessage} />}
      {!isEdit && !hasRoleOptions && (
        <Alert
          variant="warning"
          title="Sin roles disponibles"
          description="No hay roles cargados para asignar. Refresca la vista o crea roles antes de crear usuarios."
        />
      )}
      {isEdit && !hasRoleOptions && (
        <Alert
          variant="warning"
          title="Sin roles disponibles"
          description="No hay roles cargados para asignar. Refresca la vista antes de editar usuarios."
        />
      )}

      {!isEdit ? (
        <form className="mt-4 space-y-4" onSubmit={handleSubmitCreate}>
          <input
            type="hidden"
            {...createForm.register('role', {
              validate: (value) => createSchema.shape.role.safeParse(value).success || 'Selecciona un rol.',
            })}
          />
          <Input
            label="Usuario"
            placeholder="usuario.corporativo"
            disabled={isSubmitting}
            {...createForm.register('username', {
              validate: (value) => createSchema.shape.username.safeParse(value).success || 'El usuario es obligatorio.',
            })}
            error={createForm.formState.errors.username?.message}
          />
          <Input
            label="Email"
            type="email"
            placeholder="user@example.com"
            disabled={isSubmitting}
            {...createForm.register('email', {
              validate: (value) => createSchema.shape.email.safeParse(value).success || 'Ingresa un email válido.',
            })}
            error={createForm.formState.errors.email?.message}
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            {...createForm.register('password', {
              validate: (value) =>
                createSchema.shape.password.safeParse(value).success || 'La contraseña debe tener al menos 6 caracteres.',
            })}
            error={createForm.formState.errors.password?.message}
          />
          <div className="w-full sm:w-64">
            <Select
              label="Rol"
              value={createForm.watch('role') ?? ''}
              onChange={(event) =>
                createForm.setValue('role', event.target.value, { shouldDirty: true, shouldValidate: true })
              }
              disabled={isSubmitting || !hasRoleOptions}
              helperText="Obligatorio. Se asigna justo después de crear el usuario."
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
              validate: (value) => editSchema.shape.role.safeParse(value).success || 'Selecciona un rol.',
            })}
          />
          <Input
            label="Usuario"
            disabled={isSubmitting}
            {...editForm.register('username', {
              validate: (value) => editSchema.shape.username.safeParse(value).success || 'El usuario es obligatorio.',
            })}
            error={editForm.formState.errors.username?.message}
          />
          <Input
            label="Email"
            type="email"
            disabled={isSubmitting}
            {...editForm.register('email', {
              validate: (value) => editSchema.shape.email.safeParse(value).success || 'Ingresa un email válido.',
            })}
            error={editForm.formState.errors.email?.message}
          />
          <Input
            label="Nueva contraseña (opcional)"
            type="password"
            placeholder="Dejar vacío para mantener"
            disabled={isSubmitting}
            {...editForm.register('password', { validate: () => true })}
            error={editForm.formState.errors.password?.message}
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Switch
              label={editForm.watch('isActive') ? 'Cuenta activa' : 'Cuenta inactiva'}
              checked={editForm.watch('isActive')}
              onChange={(event) =>
                editForm.setValue('isActive', event.target.checked, { shouldDirty: true, shouldValidate: true })
              }
              disabled={isSubmitting || itself}
            />
            <div className="w-full sm:w-64">
              <Select
                label="Rol"
                value={editForm.watch('role') ?? ''}
                onChange={(event) =>
                  editForm.setValue('role', event.target.value, { shouldDirty: true, shouldValidate: true })
                }
                disabled={isSubmitting || !hasRoleOptions}
                helperText="Se asigna vía endpoint de roles."
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
                label="Marcar como superuser"
                helperText="Solo disponible para usuarios con rol admin. Habilita acceso completo a la consola."
              />
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}
