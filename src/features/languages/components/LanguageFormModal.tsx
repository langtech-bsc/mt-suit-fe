import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { Alert, Button, Input, Modal, Switch } from '../../../components/ui'
import type { LanguageRecord, LanguageUpsertInput } from '../types'

type Mode = 'create' | 'edit'

const languageSchema = z.object({
  name: z.string().min(2, 'El nombre del idioma es obligatorio.'),
  isoCode: z
    .string()
    .min(2, 'El código ISO es obligatorio.')
    .max(10, 'El código ISO es demasiado largo.')
    .regex(/^[a-zA-Z-]+$/, 'Usa solo letras y guiones.'),
  nativeName: z.string().optional(),
  sortOrder: z.number().int().min(0, 'El orden debe ser 0 o mayor.'),
  isActive: z.boolean(),
})

interface LanguageFormModalProps {
  open: boolean
  mode: Mode
  language?: LanguageRecord | null
  isSubmitting: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (payload: LanguageUpsertInput) => void
}

export const LanguageFormModal = ({
  open,
  mode,
  language,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: LanguageFormModalProps) => {
  const isEdit = mode === 'edit'
  const [name, setName] = useState('')
  const [isoCode, setIsoCode] = useState('')
  const [nativeName, setNativeName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) {
      return
    }
    setName(language?.name ?? '')
    setIsoCode(language?.isoCode ?? '')
    setNativeName(language?.nativeName ?? language?.name ?? '')
    setSortOrder(language?.sortOrder ?? 0)
    setIsActive(language?.isActive ?? true)
    setValidationError(null)
    setFieldErrors({})
  }, [open, language])

  const validateField = useCallback((field: 'name' | 'isoCode' | 'nativeName' | 'sortOrder', value: unknown) => {
    setFieldErrors((current) => {
      const next = { ...current }

      if (field === 'name') {
        const validation = languageSchema.shape.name.safeParse(value)
        if (!validation.success) {
          next.name = validation.error.issues[0]?.message ?? 'El nombre del idioma es obligatorio.'
        } else {
          delete next.name
        }
        return next
      }

      if (field === 'isoCode') {
        const validation = languageSchema.shape.isoCode.safeParse(value)
        if (!validation.success) {
          next.isoCode = validation.error.issues[0]?.message ?? 'El código ISO es obligatorio.'
        } else {
          delete next.isoCode
        }
        return next
      }

      if (field === 'nativeName') {
        const validation = languageSchema.shape.nativeName.safeParse(value)
        if (!validation.success) {
          next.nativeName = validation.error.issues[0]?.message ?? 'Revisa el nombre nativo.'
        } else {
          delete next.nativeName
        }
        return next
      }

      const validation = languageSchema.shape.sortOrder.safeParse(value)
      if (!validation.success) {
        next.sortOrder = validation.error.issues[0]?.message ?? 'El orden debe ser 0 o mayor.'
      } else {
        delete next.sortOrder
      }
      return next
    })
  }, [])

  const handleSubmit = () => {
    setValidationError(null)

    const validation = languageSchema.safeParse({
      name,
      isoCode,
      nativeName,
      sortOrder,
      isActive,
    })

    if (!validation.success) {
      setValidationError(validation.error.issues[0]?.message ?? 'Revisa los datos del formulario.')
      return
    }

    onSubmit({
      name: validation.data.name,
      isoCode: validation.data.isoCode,
      nativeName: validation.data.nativeName?.trim() ? validation.data.nativeName.trim() : undefined,
      sortOrder: validation.data.sortOrder,
      isActive: validation.data.isActive,
    })
  }

  const submitButtonText = isEdit ? 'Guardar cambios' : 'Añadir idioma'

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Guardando…' : submitButtonText}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar idioma' : 'Añadir idioma'}
      description={isEdit ? 'Actualiza nombre, nativo, estado y orden.' : 'Añade un idioma nuevo disponible para toda la plataforma.'}
      footer={footer}
      size="lg"
    >
      {(validationError || errorMessage) && (
        <Alert variant="danger" title="Revisa el formulario" description={validationError ?? errorMessage ?? undefined} />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input
          label="Nombre del idioma"
          placeholder="Spanish"
          value={name}
          onChange={(event) => {
            const nextValue = event.target.value
            setName(nextValue)
            validateField('name', nextValue)
          }}
          disabled={isSubmitting}
          error={fieldErrors.name}
        />
        <Input
          label="Código ISO"
          placeholder="es"
          value={isoCode}
          onChange={(event) => {
            const nextValue = event.target.value
            setIsoCode(nextValue)
            validateField('isoCode', nextValue)
          }}
          disabled={isSubmitting}
          helperText={isEdit ? 'No se puede cambiar en edición.' : 'Ej: es, en, pt-BR'}
          error={fieldErrors.isoCode}
        />
        <Input
          label="Nombre nativo"
          placeholder="Español"
          value={nativeName}
          onChange={(event) => {
            const nextValue = event.target.value
            setNativeName(nextValue)
            validateField('nativeName', nextValue)
          }}
          disabled={isSubmitting}
          error={fieldErrors.nativeName}
        />
        <Input
          label="Orden"
          type="number"
          value={String(sortOrder)}
          onChange={(event) => {
            const nextValue = Number(event.target.value ?? 0)
            setSortOrder(nextValue)
            validateField('sortOrder', nextValue)
          }}
          disabled={isSubmitting}
          error={fieldErrors.sortOrder}
        />
      </div>

      <div className="mt-4">
        <Switch
          label={isActive ? 'Idioma activo' : 'Idioma deshabilitado'}
          description="Los idiomas deshabilitados no aparecen en selectores."
          checked={isActive}
          onChange={(event) => {
            setIsActive(event.target.checked)
          }}
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  )
}
