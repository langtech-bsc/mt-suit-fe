import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, Button, Checkbox, Input, Modal, Select, Switch } from '../../../components/ui'
import type { AdminUserRecord } from '../types'
import { useAuthStore } from '../../auth/store/auth.store'

type Mode = 'create' | 'edit'

const createSchema = z.object({
  username: z.string().min(3, 'El usuario es obligatorio.'),
  email: z.email('Ingresa un email válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  role: z
    .string()
    .min(1, 'Selecciona un rol.')
    .refine((value) => value !== 'all', 'Selecciona un rol.'),
})

const editSchema = z.object({
  username: z.string().min(3, 'El usuario es obligatorio.'),
  email: z.email('Ingresa un email válido.'),
  password: z.string().optional(),
  isActive: z.boolean(),
  role: z.string().optional(),
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

  const itself = useMemo(() => {
    if (!isEdit || !user || !currentUserLogged) {
      return false
    }
    return user.id === Number(currentUserLogged.id)
  }, [isEdit, user, currentUserLogged])
  const defaultEditRole = useMemo(() => {
    if (!user) {
      return 'all'
    }
    const candidate = user.roles[0]?.name
    if (!candidate) {
      return 'all'
    }
    return roleOptions.includes(candidate) ? candidate : 'all'
  }, [user, roleOptions])

  const createForm = useForm<CreateUserInput>({
    mode: 'onBlur',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role: roleOptions[0] ?? '',
    },
  })

  const editForm = useForm<EditUserInput>({
    mode: 'onBlur',
    values: {
      username: user?.username ?? '',
      email: user?.email ?? '',
      password: '',
      isActive: Boolean(user?.isActive),
      role: defaultEditRole,
      isSuperuser: Boolean(user?.isSuperuser),
    },
  })

  const handleSubmitCreate = createForm.handleSubmit((values) => {
    const validation = createSchema.safeParse(values)
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string') {
          createForm.setError(field as keyof CreateUserInput, { type: 'manual', message: issue.message })
        }
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
      for (const issue of validation.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string') {
          editForm.setError(field as keyof EditUserInput, { type: 'manual', message: issue.message })
        }
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

    const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button
        variant="primary"
        onClick={isEdit ? handleSubmitEdit : handleSubmitCreate}
        disabled={isSubmitting || isCreateDisabled}
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
      {errorMessage && <Alert variant="danger" title="No pudimos completar la acción" description={errorMessage} />}
      {!isEdit && !hasRoleOptions && (
        <Alert
          variant="warning"
          title="Sin roles disponibles"
          description="No hay roles cargados para asignar. Refresca la vista o crea roles antes de crear usuarios."
        />
      )}

      {!isEdit ? (
        <form className="mt-4 space-y-4" onSubmit={handleSubmitCreate}>
          <Input label="Usuario" placeholder="usuario.corporativo" disabled={isSubmitting} {...createForm.register('username')} error={createForm.formState.errors.username?.message} />
          <Input label="Email" type="email" placeholder="user@example.com" disabled={isSubmitting} {...createForm.register('email')} error={createForm.formState.errors.email?.message} />
          <Input label="Contraseña" type="password" placeholder="••••••••" disabled={isSubmitting} {...createForm.register('password')} error={createForm.formState.errors.password?.message} />
          <div className="w-full sm:w-64">
            <Select
              label="Rol"
              value={createForm.watch('role') ?? ''}
              onChange={(event) => createForm.setValue('role', event.target.value)}
              disabled={isSubmitting || !hasRoleOptions}
              helperText="Obligatorio. Se asigna justo después de crear el usuario."
              options={[
                ...roleOptions.map((value) => ({ value, label: value })),
              ]}
            />
          </div>
        </form>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmitEdit}>
          <Input label="Usuario" disabled={isSubmitting} {...editForm.register('username')} error={editForm.formState.errors.username?.message} />
          <Input label="Email" type="email" disabled={isSubmitting} {...editForm.register('email')} error={editForm.formState.errors.email?.message} />
          <Input
            label="Nueva contraseña (opcional)"
            type="password"
            placeholder="Dejar vacío para mantener"
            disabled={isSubmitting}
            {...editForm.register('password')}
            error={editForm.formState.errors.password?.message}
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Switch
              label={editForm.watch('isActive') ? 'Cuenta activa' : 'Cuenta inactiva'}
              checked={editForm.watch('isActive')}
              onChange={(event) => editForm.setValue('isActive', event.target.checked)}
              disabled={isSubmitting || itself}
            />
            <div className="w-full sm:w-64">
              <Select
                label="Rol"
                value={editForm.watch('role') ?? 'all'}
                onChange={(event) => editForm.setValue('role', event.target.value)}
                disabled={isSubmitting}
                helperText="Se asigna vía endpoint de roles."
                options={[
                  { value: 'all', label: 'Sin rol' },
                  ...roleOptions.map((value) => ({ value, label: value })),
                ]}
              />
            </div>
          </div>

          {editForm.watch('role') === 'admin' && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <Checkbox
                checked={Boolean(editForm.watch('isSuperuser'))}
                onChange={(event) => editForm.setValue('isSuperuser', event.target.checked)}
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
