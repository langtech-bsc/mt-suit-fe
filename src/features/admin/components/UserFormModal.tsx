import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, Button, Input, Modal, Select, Switch } from '../../../components/ui'
import type { AdminUserRecord } from '../types'
import { useAuthStore } from '../../auth/store/auth.store'

type Mode = 'create' | 'edit'

const createSchema = z.object({
  username: z.string().min(3, 'El usuario es obligatorio.'),
  email: z.email('Ingresa un email válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
})

const editSchema = z.object({
  username: z.string().min(3, 'El usuario es obligatorio.'),
  email: z.email('Ingresa un email válido.'),
  password: z.string().optional(),
  isActive: z.boolean(),
  role: z.string().optional(),
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
    
    const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button
        variant="primary"
        onClick={isEdit ? handleSubmitEdit : handleSubmitCreate}
        disabled={isSubmitting}
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

      {!isEdit ? (
        <form className="mt-4 space-y-4" onSubmit={handleSubmitCreate}>
          <Input label="Usuario" placeholder="usuario.corporativo" disabled={isSubmitting} {...createForm.register('username')} error={createForm.formState.errors.username?.message} />
          <Input label="Email" type="email" placeholder="user@example.com" disabled={isSubmitting} {...createForm.register('email')} error={createForm.formState.errors.email?.message} />
          <Input label="Contraseña" type="password" placeholder="••••••••" disabled={isSubmitting} {...createForm.register('password')} error={createForm.formState.errors.password?.message} />
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
                helperText="Selección disponible; persistencia pendiente de endpoint de roles."
                options={[
                  { value: 'all', label: 'Sin rol' },
                  ...roleOptions.map((value) => ({ value, label: value })),
                ]}
              />
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
