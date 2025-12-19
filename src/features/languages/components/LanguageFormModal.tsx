import { useEffect, useMemo, useState } from 'react'
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
  const [didInteract, setDidInteract] = useState(false)

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
    setDidInteract(false)
  }, [open, language])

  const currentValues = useMemo(
    () => ({
      name,
      isoCode,
      nativeName,
      sortOrder,
      isActive,
    }),
    [isActive, isoCode, name, nativeName, sortOrder],
  )

  useEffect(() => {
    if (!open || !didInteract) {
      return
    }

    const validation = languageSchema.safeParse(currentValues)
    if (validation.success) {
      setFieldErrors({})
      return
    }

    const next: Record<string, string> = {}
    for (const issue of validation.error.issues) {
      const field = issue.path[0]
      if (typeof field === 'string' && !next[field]) {
        next[field] = issue.message
      }
    }
    setFieldErrors(next)
  }, [currentValues, didInteract, open])

  const handleSubmit = () => {
    setValidationError(null)
    setDidInteract(true)
    const validation = languageSchema.safeParse(currentValues)

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
            setDidInteract(true)
            setName(event.target.value)
          }}
          disabled={isSubmitting}
          error={fieldErrors.name}
        />
        <Input
          label="Código ISO"
          placeholder="es"
          value={isoCode}
          onChange={(event) => {
            setDidInteract(true)
            setIsoCode(event.target.value)
          }}
          disabled={isSubmitting || isEdit}
          helperText={isEdit ? 'No se puede cambiar en edición.' : 'Ej: es, en, pt-BR'}
          error={fieldErrors.isoCode}
        />
        <Input
          label="Nombre nativo"
          placeholder="Español"
          value={nativeName}
          onChange={(event) => {
            setDidInteract(true)
            setNativeName(event.target.value)
          }}
          disabled={isSubmitting}
          error={fieldErrors.nativeName}
        />
        <Input
          label="Orden"
          type="number"
          value={String(sortOrder)}
          onChange={(event) => {
            setDidInteract(true)
            setSortOrder(Number(event.target.value ?? 0))
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
            setDidInteract(true)
            setIsActive(event.target.checked)
          }}
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  )
}
