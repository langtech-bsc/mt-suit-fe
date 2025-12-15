import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { Alert, Button, Input, Modal, Switch, Textarea } from '../../../components/ui'
import type { ProviderConfiguration, ProviderCreateInput, ProviderRecord, ProviderUpdateInput } from '../types'

type Mode = 'create' | 'edit'

const createSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio.'),
  providerType: z.string().min(2, 'El tipo de proveedor es obligatorio.'),
  endpoint: z.string().min(1, 'El endpoint es obligatorio.'),
  region: z.string().optional(),
  apiKey: z.string().min(1, 'El API key es obligatorio.'),
  isActive: z.boolean(),
  isDefault: z.boolean(),
})

const editSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio.'),
  endpoint: z.string().min(1, 'El endpoint es obligatorio.'),
  region: z.string().optional(),
  apiKey: z.string().optional(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
})

const stringifyConfig = (config: ProviderConfiguration) => {
  try {
    return JSON.stringify(config ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

const parseConfig = (raw: string): { ok: true; value: ProviderConfiguration } | { ok: false; message: string } => {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: true, value: {} }
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: 'La configuración debe ser un objeto JSON.' }
    }
    return { ok: true, value: parsed as ProviderConfiguration }
  } catch {
    return { ok: false, message: 'Configuración inválida. Revisa el JSON.' }
  }
}

interface ProviderFormModalProps {
  open: boolean
  mode: Mode
  provider?: ProviderRecord | null
  isSubmitting: boolean
  errorMessage: string | null
  onClose: () => void
  onCreate: (payload: ProviderCreateInput) => void
  onEdit: (providerId: number, payload: ProviderUpdateInput) => void
}

export const ProviderFormModal = ({
  open,
  mode,
  provider,
  isSubmitting,
  errorMessage,
  onClose,
  onCreate,
  onEdit,
}: ProviderFormModalProps) => {
  const isEdit = mode === 'edit'
  const [name, setName] = useState('')
  const [providerType, setProviderType] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [region, setRegion] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [configRaw, setConfigRaw] = useState('{}')
  const [isActive, setIsActive] = useState(true)
  const [isDefault, setIsDefault] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const title = useMemo(() => (isEdit ? 'Editar proveedor' : 'Añadir proveedor'), [isEdit])

  useEffect(() => {
    if (!open) {
      return
    }

    setName(provider?.name ?? '')
    setProviderType(provider?.providerType ?? '')
    setEndpoint(provider?.endpoint ?? '')
    setRegion(provider?.region ?? '')
    setApiKey('')
    setConfigRaw(stringifyConfig(provider?.configuration ?? {}))
    setIsActive(provider?.isActive ?? true)
    setIsDefault(provider?.isDefault ?? false)
    setValidationError(null)
  }, [open, provider])

  const handleSubmit = () => {
    setValidationError(null)

    const configValidation = parseConfig(configRaw)
    if (!configValidation.ok) {
      setValidationError(configValidation.message)
      return
    }

    if (!isEdit) {
      const validation = createSchema.safeParse({
        name,
        providerType,
        endpoint,
        region,
        apiKey,
        isActive,
        isDefault,
      })

      if (!validation.success) {
        setValidationError(validation.error.issues[0]?.message ?? 'Revisa el formulario.')
        return
      }

      onCreate({
        name: validation.data.name,
        providerType: validation.data.providerType,
        endpoint: validation.data.endpoint,
        region: validation.data.region?.trim() ?? '',
        apiKey: validation.data.apiKey,
        configuration: configValidation.value,
        isActive: validation.data.isActive,
        isDefault: validation.data.isDefault,
      })
      return
    }

    if (!provider) {
      return
    }

    const validation = editSchema.safeParse({
      name,
      endpoint,
      region,
      apiKey,
      isActive,
      isDefault,
    })

    if (!validation.success) {
      setValidationError(validation.error.issues[0]?.message ?? 'Revisa el formulario.')
      return
    }

    onEdit(provider.id, {
      name: validation.data.name,
      endpoint: validation.data.endpoint,
      region: validation.data.region?.trim() ?? '',
      apiKey: validation.data.apiKey?.trim() ? validation.data.apiKey.trim() : undefined,
      configuration: configValidation.value,
      isActive: validation.data.isActive,
      isDefault: validation.data.isDefault,
    })
  }

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear proveedor'}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={isEdit ? 'Actualiza datos y estado del proveedor.' : 'Crea un proveedor de traducción disponible para la plataforma.'}
      footer={footer}
      size="lg"
    >
      {(validationError || errorMessage) && (
        <Alert variant="danger" title="Revisa el formulario" description={validationError ?? errorMessage ?? undefined} />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
        <Input
          label="Tipo"
          placeholder="openai / google"
          value={providerType}
          onChange={(e) => setProviderType(e.target.value)}
          disabled={isSubmitting || isEdit}
          helperText={isEdit ? 'No se puede cambiar en edición.' : 'Ej: openai, google'}
        />
        <Input label="Endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} disabled={isSubmitting} />
        <Input label="Región" value={region} onChange={(e) => setRegion(e.target.value)} disabled={isSubmitting} />
        <Input
          className="md:col-span-2"
          label={isEdit ? 'API key (opcional)' : 'API key'}
          type="password"
          placeholder={isEdit ? 'Dejar vacío para mantener' : '••••••••'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={isSubmitting}
        />
        <Textarea
          className="md:col-span-2 min-h-[160px] font-mono text-xs"
          label="Configuración (JSON)"
          value={configRaw}
          onChange={(e) => setConfigRaw(e.target.value)}
          disabled={isSubmitting}
          helperText={'Debe ser un objeto JSON. Ej: { "model": "gpt-4o-mini" }'}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-6">
        <Switch
          label={isActive ? 'Proveedor activo' : 'Proveedor deshabilitado'}
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={isSubmitting}
        />
        <Switch
          label={isDefault ? 'Proveedor por defecto' : 'No es por defecto'}
          checked={isDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  )
}
