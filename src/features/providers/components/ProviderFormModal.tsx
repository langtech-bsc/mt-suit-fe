import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { Alert, Button, Checkbox, Input, Modal, PasswordInput, Switch, Textarea } from '../../../components/ui'
import { useLanguagesQuery } from '../../languages/queries/useLanguagesQuery'
import { useLanguagesStore } from '../../languages/store/languages.store'
import type { ProviderConfiguration, ProviderCreateInput, ProviderRecord, ProviderUpdateInput } from '../types'

type Mode = 'create' | 'edit'

const createSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio.'),
  providerType: z.string().min(2, 'El tipo de proveedor es obligatorio.'),
  endpoint: z.url('El endpoint debe ser una URL válida (incluye https://).'),
  region: z.string().optional(),
  inputLanguageIds: z.array(z.number()).min(1, 'Selecciona al menos un idioma de entrada.'),
  outputLanguageIds: z.array(z.number()).min(1, 'Selecciona al menos un idioma de salida.'),
  apiKey: z.string().min(1, 'El API key es obligatorio.'),
  isActive: z.boolean(),
  isDefault: z.boolean(),
})

const editSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio.'),
  endpoint: z.url('El endpoint debe ser una URL válida (incluye https://).'),
  region: z.string().optional(),
  apiKey: z.string().optional(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  inputLanguageIds: z.array(z.number()).min(1, 'Selecciona al menos un idioma de entrada.'),
  outputLanguageIds: z.array(z.number()).min(1, 'Selecciona al menos un idioma de salida.'),
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

const normalize = (value: string) => value.trim().toLowerCase()

const toggleNumberInList = (list: number[], value: number) => {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
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
  const { isLoading: isLoadingLanguages, error: languagesError } = useLanguagesQuery()
  const allLanguages = useLanguagesStore((state) => state.languages)

  const languages = useMemo(() => {
    return allLanguages
      .filter((lang) => lang.isActive)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allLanguages])

  const [name, setName] = useState('')
  const [providerType, setProviderType] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [region, setRegion] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [configRaw, setConfigRaw] = useState('{}')
  const [isActive, setIsActive] = useState(true)
  const [isDefault, setIsDefault] = useState(false)
  const [inputLanguageIds, setInputLanguageIds] = useState<number[]>([])
  const [outputLanguageIds, setOutputLanguageIds] = useState<number[]>([])
  const [inputFilter, setInputFilter] = useState('')
  const [outputFilter, setOutputFilter] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [didInteract, setDidInteract] = useState(false)

  const title = useMemo(() => (isEdit ? 'Editar proveedor' : 'Añadir proveedor'), [isEdit])

  useEffect(() => {
    if (!open) {
      return
    }

    setName(provider?.name ?? '')
    setProviderType(provider?.providerType ?? '')
    setEndpoint(provider?.endpoint ?? '')
    setRegion(provider?.region ?? '')
    setApiKey(provider?.apiKey ?? '')
    setConfigRaw(stringifyConfig(provider?.configuration ?? {}))
    setIsActive(provider?.isActive ?? true)
    setIsDefault(provider?.isDefault ?? false)
    setInputLanguageIds(provider?.inputLanguageIds ?? provider?.inputLanguages?.map((lang) => lang.id) ?? [])
    setOutputLanguageIds(provider?.outputLanguageIds ?? provider?.outputLanguages?.map((lang) => lang.id) ?? [])
    setInputFilter('')
    setOutputFilter('')
    setValidationError(null)
    setFieldErrors({})
    setDidInteract(false)
  }, [open, provider])

  useEffect(() => {
    if (!open || !didInteract) {
      return
    }

    const configValidation = parseConfig(configRaw)
    const configError = configValidation.ok ? undefined : configValidation.message

    const schema = isEdit ? editSchema : createSchema
    const validation = schema.safeParse({
      name,
      providerType,
      endpoint,
      region,
      inputLanguageIds,
      outputLanguageIds,
      apiKey,
      isActive,
      isDefault,
    })

    const next: Record<string, string> = {}
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string' && !next[field]) {
          next[field] = issue.message
        }
      }
    }

    if (configError) {
      next.configuration = configError
    }

    setFieldErrors(next)
  }, [
    apiKey,
    configRaw,
    didInteract,
    endpoint,
    inputLanguageIds,
    isActive,
    isDefault,
    isEdit,
    name,
    open,
    outputLanguageIds,
    providerType,
    region,
  ])

  const filteredInputLanguages = useMemo(() => {
    const query = normalize(inputFilter)
    if (!query) {
      return languages
    }
    return languages.filter((lang) => normalize(`${lang.name} ${lang.isoCode}`).includes(query))
  }, [inputFilter, languages])

  const filteredOutputLanguages = useMemo(() => {
    const query = normalize(outputFilter)
    if (!query) {
      return languages
    }
    return languages.filter((lang) => normalize(`${lang.name} ${lang.isoCode}`).includes(query))
  }, [outputFilter, languages])

  const allLanguageIds = useMemo(() => languages.map((lang) => lang.id), [languages])
  const allInputSelected = useMemo(
    () => allLanguageIds.length > 0 && allLanguageIds.every((id) => inputLanguageIds.includes(id)),
    [allLanguageIds, inputLanguageIds],
  )
  const inputIndeterminate = useMemo(
    () => inputLanguageIds.length > 0 && !allInputSelected,
    [allInputSelected, inputLanguageIds.length],
  )
  const allOutputSelected = useMemo(
    () => allLanguageIds.length > 0 && allLanguageIds.every((id) => outputLanguageIds.includes(id)),
    [allLanguageIds, outputLanguageIds],
  )
  const outputIndeterminate = useMemo(
    () => outputLanguageIds.length > 0 && !allOutputSelected,
    [allOutputSelected, outputLanguageIds.length],
  )

  const handleSubmit = () => {
    setValidationError(null)
    setDidInteract(true)

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
        inputLanguageIds,
        outputLanguageIds,
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
        inputLanguageIds: validation.data.inputLanguageIds,
        outputLanguageIds: validation.data.outputLanguageIds,
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
      inputLanguageIds,
      outputLanguageIds,
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
      inputLanguageIds: validation.data.inputLanguageIds,
      outputLanguageIds: validation.data.outputLanguageIds,
    })
  }

  const submitButtonText = isEdit ? 'Guardar cambios' : 'Crear proveedor'

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
      title={title}
      description={isEdit ? 'Actualiza datos y estado del proveedor.' : 'Crea un proveedor de traducción disponible para la plataforma.'}
      footer={footer}
      size="lg"
    >
      {(validationError || errorMessage) && (
        <Alert variant="danger" title="Revisa el formulario" description={validationError ?? errorMessage ?? undefined} />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => {
            setDidInteract(true)
            setName(e.target.value)
          }}
          disabled={isSubmitting}
          error={fieldErrors.name}
        />
        <Input
          label="Tipo"
          placeholder="openai / google"
          value={providerType}
          onChange={(e) => {
            setDidInteract(true)
            setProviderType(e.target.value)
          }}
          disabled={isSubmitting || isEdit}
          helperText={isEdit ? 'No se puede cambiar en edición.' : 'Ej: openai, google'}
          error={fieldErrors.providerType}
        />
        <Input
          label="Endpoint"
          placeholder="https://api.example.com"
          value={endpoint}
          onChange={(e) => {
            setDidInteract(true)
            setEndpoint(e.target.value)
          }}
          disabled={isSubmitting}
          helperText="Debe ser una URL válida (incluye https://)."
          error={fieldErrors.endpoint}
        />
        <Input
          label="Región"
          value={region}
          onChange={(e) => {
            setDidInteract(true)
            setRegion(e.target.value)
          }}
          disabled={isSubmitting}
          error={fieldErrors.region}
        />
        <PasswordInput
          className="md:col-span-2"
          label={isEdit ? 'API key (opcional)' : 'API key'}
          placeholder={isEdit ? 'Dejar vacío para mantener' : '••••••••'}
          value={apiKey}
          onChange={(e) => {
            setDidInteract(true)
            setApiKey(e.target.value)
          }}
          disabled={isSubmitting}
          error={fieldErrors.apiKey}
        />
        <Textarea
          className="md:col-span-2 min-h-40 font-mono text-xs"
          label="Configuración (JSON)"
          value={configRaw}
          onChange={(e) => {
            setDidInteract(true)
            setConfigRaw(e.target.value)
          }}
          disabled={isSubmitting}
          helperText={'Debe ser un objeto JSON. Ej: { "model": "gpt-4o-mini" }'}
          error={fieldErrors.configuration}
        />
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-bsc-blue-dark dark:text-white">Idiomas soportados</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Entrada: {inputLanguageIds.length} · Salida: {outputLanguageIds.length}
          </p>
        </div>
        {languagesError && (
          <Alert variant="danger" title="No pudimos cargar los idiomas" description={(languagesError).message} />
        )}
        {(fieldErrors.inputLanguageIds || fieldErrors.outputLanguageIds) && (
          <Alert
            variant="warning"
            title="Selecciona idiomas válidos"
            description={fieldErrors.inputLanguageIds ?? fieldErrors.outputLanguageIds ?? undefined}
          />
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Idiomas de entrada</p>
              <Checkbox
                label="Todos"
                checked={allInputSelected}
                indeterminate={inputIndeterminate}
                onChange={() => {
                  setDidInteract(true)
                  setInputLanguageIds(allInputSelected ? [] : allLanguageIds)
                }}
                disabled={isSubmitting ?? isLoadingLanguages ?? languages.length === 0}
              />
            </div>
            <Input
              placeholder="Buscar…"
              value={inputFilter}
              onChange={(e) => setInputFilter(e.target.value)}
              disabled={isSubmitting || isLoadingLanguages}
            />
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {filteredInputLanguages.map((lang) => (
                <Checkbox
                  key={`in-${lang.id}`}
                  label={
                    <span className="flex items-center justify-between gap-2">
                      <span>{lang.name}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">{lang.isoCode}</span>
                    </span>
                  }
                  checked={inputLanguageIds.includes(lang.id)}
                  onChange={() => {
                    setDidInteract(true)
                    setInputLanguageIds((current) => toggleNumberInList(current, lang.id))
                  }}
                  disabled={isSubmitting || isLoadingLanguages}
                />
              ))}
              {!isLoadingLanguages && filteredInputLanguages.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-slate-400">Sin coincidencias.</p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Idiomas de salida</p>
              <Checkbox
                label="Todos"
                checked={allOutputSelected}
                indeterminate={outputIndeterminate}
                onChange={() => {
                  setDidInteract(true)
                  setOutputLanguageIds(allOutputSelected ? [] : allLanguageIds)
                }}
                disabled={isSubmitting ?? isLoadingLanguages ?? languages.length === 0}
              />
            </div>
            <Input
              placeholder="Buscar…"
              value={outputFilter}
              onChange={(e) => setOutputFilter(e.target.value)}
              disabled={isSubmitting || isLoadingLanguages}
            />
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {filteredOutputLanguages.map((lang) => (
                <Checkbox
                  key={`out-${lang.id}`}
                  label={
                    <span className="flex items-center justify-between gap-2">
                      <span>{lang.name}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">{lang.isoCode}</span>
                    </span>
                  }
                  checked={outputLanguageIds.includes(lang.id)}
                  onChange={() => {
                    setDidInteract(true)
                    setOutputLanguageIds((current) => toggleNumberInList(current, lang.id))
                  }}
                  disabled={isSubmitting || isLoadingLanguages}
                />
              ))}
              {!isLoadingLanguages && filteredOutputLanguages.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-slate-400">Sin coincidencias.</p>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Estos idiomas controlan qué opciones aparecen en el traductor cuando se seleccione este modelo.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-6">
        <Switch
          label={isActive ? 'Proveedor activo' : 'Proveedor deshabilitado'}
          checked={isActive}
          onChange={(event) => {
            setDidInteract(true)
            setIsActive(event.target.checked)
          }}
          disabled={isSubmitting}
        />
        <Switch
          label={isDefault ? 'Proveedor por defecto' : 'No es por defecto'}
          checked={isDefault}
          onChange={(event) => {
            setDidInteract(true)
            setIsDefault(event.target.checked)
          }}
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  )
}
