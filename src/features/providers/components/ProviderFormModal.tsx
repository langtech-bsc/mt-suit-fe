import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Checkbox, Input, Modal, PasswordInput, Switch, Textarea } from '../../../components/ui'
import { useLanguagesQuery } from '../../languages/queries/useLanguagesQuery'
import { useLanguagesStore } from '../../languages/store/languages.store'
import type { ProviderConfiguration, ProviderCreateInput, ProviderRecord, ProviderUpdateInput } from '../types'

type Mode = 'create' | 'edit'

type LanguageOption = {
  id: number
  name: string
  isoCode: string
}

const stringifyConfig = (config: ProviderConfiguration) => {
  try {
    return JSON.stringify(config ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

const parseConfig = (
  raw: string,
  messages: { mustBeObject: string; invalidJson: string },
): { ok: true; value: ProviderConfiguration } | { ok: false; message: string } => {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: true, value: {} }
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: messages.mustBeObject }
    }
    return { ok: true, value: parsed as ProviderConfiguration }
  } catch {
    return { ok: false, message: messages.invalidJson }
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

const LanguagePickerPanel = memo(function LanguagePickerPanel(
  props: Readonly<{
    title: string
    filterValue: string
    onFilterChange: (next: string) => void
    languages: LanguageOption[]
    selectedIds: number[]
    onToggle: (id: number) => void
    allSelected: boolean
    indeterminate: boolean
    onToggleAll: () => void
    disabled: boolean
    isLoading: boolean
    isEmptyDisabled?: boolean
    allLabel: string
    filterPlaceholder: string
    noMatchesText: string
  }>,
) {
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{props.title}</p>
        <Checkbox
          label={props.allLabel}
          checked={props.allSelected}
          indeterminate={props.indeterminate}
          onChange={props.onToggleAll}
          disabled={props.disabled || props.isLoading || props.isEmptyDisabled === true}
        />
      </div>
      <Input
        placeholder={props.filterPlaceholder}
        value={props.filterValue}
        onChange={(e) => props.onFilterChange(e.target.value)}
        disabled={props.disabled || props.isLoading}
      />
      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {props.languages.map((lang) => (
          <Checkbox
            key={lang.id}
            label={
              <span className="flex items-center justify-between gap-2">
                <span>{lang.name}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400">{lang.isoCode}</span>
              </span>
            }
            checked={props.selectedIds.includes(lang.id)}
            onChange={() => props.onToggle(lang.id)}
            disabled={props.disabled || props.isLoading}
          />
        ))}
        {!props.isLoading && props.languages.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-slate-400">{props.noMatchesText}</p>
        )}
      </div>
    </div>
  )
})

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
  const { t } = useTranslation()
  const isEdit = mode === 'edit'
  const { isLoading: isLoadingLanguages, error: languagesError } = useLanguagesQuery()
  const allLanguages = useLanguagesStore((state) => state.languages)
  const createSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('providerFormModal.validation.nameRequired')),
        providerType: z
          .string()
          .min(2, t('providerFormModal.validation.providerTypeRequired'))
          .transform((value) => value.trim().toLowerCase())
          .refine(
            (value) => ['azure', 'google', 'deepl', 'openai', 'huggingface'].includes(value),
            t('providerFormModal.validation.providerTypeInvalid'),
          ),
        endpoint: z.url(t('providerFormModal.validation.endpointInvalid')),
        region: z.string().optional(),
        inputLanguageIds: z.array(z.number()).min(1, t('providerFormModal.validation.inputLanguageMin')),
        outputLanguageIds: z.array(z.number()).min(1, t('providerFormModal.validation.outputLanguageMin')),
        apiKey: z.string().min(1, t('providerFormModal.validation.apiKeyRequired')),
        isActive: z.boolean(),
        isDefault: z.boolean(),
      }),
    [t],
  )

  const editSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('providerFormModal.validation.nameRequired')),
        endpoint: z.url(t('providerFormModal.validation.endpointInvalid')),
        region: z.string().optional(),
        apiKey: z.string().optional(),
        isActive: z.boolean(),
        isDefault: z.boolean(),
        inputLanguageIds: z.array(z.number()).min(1, t('providerFormModal.validation.inputLanguageMin')),
        outputLanguageIds: z.array(z.number()).min(1, t('providerFormModal.validation.outputLanguageMin')),
      }),
    [t],
  )

  const schema = useMemo(() => (isEdit ? editSchema : createSchema), [createSchema, editSchema, isEdit])

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

  const title = useMemo(() => (isEdit ? t('providerFormModal.titleEdit') : t('providerFormModal.titleCreate')), [isEdit, t])

  useEffect(() => {
    if (!open) {
      return
    }

    setName(provider?.name ?? '')
    setProviderType(provider?.providerType?.toLowerCase?.() ?? '')
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
  }, [open, provider])

  const setFieldError = useCallback((field: string, message?: string) => {
    setFieldErrors((current) => {
      const next = { ...current }
      if (message) {
        next[field] = message
      } else {
        delete next[field]
      }
      return next
    })
  }, [])

  const validateSchemaField = useCallback(
    (field: string, value: unknown, fallbackMessage: string) => {
      const shape = schema.shape as Record<string, z.ZodTypeAny>
      const validator = shape[field]
      if (!validator) {
        setFieldError(field)
        return
      }
      const validation = validator.safeParse(value)
      if (!validation.success) {
        setFieldError(field, validation.error.issues[0]?.message ?? fallbackMessage)
        return
      }
      setFieldError(field)
    },
    [schema.shape, setFieldError],
  )

  const validateConfig = useCallback(
    (raw: string) => {
      const configValidation = parseConfig(raw, {
        mustBeObject: t('providerFormModal.config.mustBeObject'),
        invalidJson: t('providerFormModal.config.invalidJson'),
      })
      setFieldError('configuration', configValidation.ok ? undefined : configValidation.message)
    },
    [setFieldError, t],
  )

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

  const handleToggleAllInput = useCallback(() => {
    const nextValue = allInputSelected ? [] : allLanguageIds
    setInputLanguageIds(nextValue)
    validateSchemaField('inputLanguageIds', nextValue, t('providerFormModal.validation.inputLanguageMin'))
  }, [allInputSelected, allLanguageIds, t, validateSchemaField])

  const handleToggleInput = useCallback(
    (languageId: number) => {
      const nextValue = toggleNumberInList(inputLanguageIds, languageId)
      setInputLanguageIds(nextValue)
      validateSchemaField('inputLanguageIds', nextValue, t('providerFormModal.validation.inputLanguageMin'))
    },
    [inputLanguageIds, t, validateSchemaField],
  )

  const handleToggleAllOutput = useCallback(() => {
    const nextValue = allOutputSelected ? [] : allLanguageIds
    setOutputLanguageIds(nextValue)
    validateSchemaField('outputLanguageIds', nextValue, t('providerFormModal.validation.outputLanguageMin'))
  }, [allLanguageIds, allOutputSelected, t, validateSchemaField])

  const handleToggleOutput = useCallback(
    (languageId: number) => {
      const nextValue = toggleNumberInList(outputLanguageIds, languageId)
      setOutputLanguageIds(nextValue)
      validateSchemaField('outputLanguageIds', nextValue, t('providerFormModal.validation.outputLanguageMin'))
    },
    [outputLanguageIds, t, validateSchemaField],
  )

  const buildFieldErrors = (
    validation: z.ZodSafeParseResult<unknown>,
    configValidation: ReturnType<typeof parseConfig>,
  ) => {
    const nextErrors: Record<string, string> = {}
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string' && !nextErrors[field]) {
          nextErrors[field] = issue.message
        }
      }
    }
    if (!configValidation.ok) {
      nextErrors.configuration = configValidation.message
    }
    return nextErrors
  }

  const buildValidationMessage = (
    validation: z.ZodSafeParseResult<unknown>,
    configValidation: ReturnType<typeof parseConfig>,
  ) => {
    const configErrorMessage = configValidation.ok ? undefined : configValidation.message
    if (validation.success && !configValidation.ok) {
      return configErrorMessage ?? t('providerFormModal.validation.reviewForm')
    }
    if (!validation.success) {
      return validation.error.issues[0]?.message ?? configErrorMessage ?? t('providerFormModal.validation.reviewForm')
    }
    return null
  }

  const submitCreate = (
    data: z.infer<typeof createSchema>,
    configuration: ProviderConfiguration,
  ) => {
    onCreate({
      name: data.name,
      providerType: data.providerType,
      endpoint: data.endpoint,
      region: data.region?.trim() ?? '',
      inputLanguageIds: data.inputLanguageIds,
      outputLanguageIds: data.outputLanguageIds,
      apiKey: data.apiKey,
      configuration,
      isActive: data.isActive,
      isDefault: data.isDefault,
    })
  }

  const submitEdit = (
    data: z.infer<typeof editSchema>,
    configuration: ProviderConfiguration,
  ) => {
    if (!provider) {
      return
    }
    onEdit(provider.id, {
      name: data.name,
      endpoint: data.endpoint,
      region: data.region?.trim() ?? '',
      apiKey: data.apiKey?.trim() ? data.apiKey.trim() : undefined,
      configuration,
      isActive: data.isActive,
      isDefault: data.isDefault,
      inputLanguageIds: data.inputLanguageIds,
      outputLanguageIds: data.outputLanguageIds,
    })
  }

  const handleSubmit = () => {
    setValidationError(null)

    const configValidation = parseConfig(configRaw, {
      mustBeObject: t('providerFormModal.config.mustBeObject'),
      invalidJson: t('providerFormModal.config.invalidJson'),
    })
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

    if (!configValidation.ok || !validation.success) {
      setFieldErrors(buildFieldErrors(validation, configValidation))
      setValidationError(buildValidationMessage(validation, configValidation))
      return
    }

    if (!isEdit) {
      submitCreate(validation.data as z.infer<typeof createSchema>, configValidation.value)
      return
    }

    submitEdit(validation.data as z.infer<typeof editSchema>, configValidation.value)
  }

  const submitButtonText = isEdit ? t('providerFormModal.buttonSave') : t('providerFormModal.buttonCreate')

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        {t('providerFormModal.cancel')}
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? t('providerFormModal.saving') : submitButtonText}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={isEdit ? t('providerFormModal.descriptionEdit') : t('providerFormModal.descriptionCreate')}
      footer={footer}
      size="lg"
    >
      {(validationError || errorMessage) && (
        <Alert
          variant="danger"
          title={t('providerFormModal.reviewFormTitle')}
          description={validationError ?? errorMessage ?? undefined}
        />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input
          label={t('providerFormModal.fields.name.label')}
          placeholder={t('providerFormModal.fields.name.placeholder')}
          value={name}
          onChange={(e) => {
            const nextValue = e.target.value
            setName(nextValue)
            validateSchemaField('name', nextValue, t('providerFormModal.validation.nameRequired'))
          }}
          disabled={isSubmitting}
          error={fieldErrors.name}
        />
        <Input
          label={t('providerFormModal.fields.providerType.label')}
          placeholder={t('providerFormModal.fields.providerType.placeholder')}
          value={providerType}
          onChange={(e) => {
            const nextValue = e.target.value.toLowerCase()
            setProviderType(nextValue)
            if (!isEdit) {
              validateSchemaField('providerType', nextValue, t('providerFormModal.validation.providerTypeRequired'))
            }
          }}
          disabled={isSubmitting || isEdit} // NOSONAR
          helperText={
            isEdit ? t('providerFormModal.fields.providerType.helperEdit') : t('providerFormModal.fields.providerType.helperCreate')
          }
          error={fieldErrors.providerType}
        />
        <Input
          label={t('providerFormModal.fields.endpoint.label')}
          placeholder="https://api.example.com"
          value={endpoint}
          onChange={(e) => {
            const nextValue = e.target.value
            setEndpoint(nextValue)
            validateSchemaField('endpoint', nextValue, t('providerFormModal.validation.endpointInvalid'))
          }}
          disabled={isSubmitting}
          helperText={t('providerFormModal.fields.endpoint.helper')}
          error={fieldErrors.endpoint}
        />
        <Input
          label={t('providerFormModal.fields.region.label')}
          value={region}
          onChange={(e) => {
            const nextValue = e.target.value
            setRegion(nextValue)
          }}
          disabled={isSubmitting}
          error={fieldErrors.region}
        />
        <PasswordInput
          className="md:col-span-2"
          label={isEdit ? t('providerFormModal.fields.apiKey.labelOptional') : t('providerFormModal.fields.apiKey.label')}
          placeholder={isEdit ? t('providerFormModal.fields.apiKey.placeholderEdit') : '••••••••'}
          value={apiKey}
          onChange={(e) => {
            const nextValue = e.target.value
            setApiKey(nextValue)
            validateSchemaField('apiKey', nextValue, t('providerFormModal.validation.apiKeyRequired'))
          }}
          disabled={isSubmitting}
          error={fieldErrors.apiKey}
        />
        <Textarea
          className="md:col-span-2 min-h-40 font-mono text-xs"
          label={t('providerFormModal.fields.configuration.label')}
          value={configRaw}
          onChange={(e) => {
            const nextValue = e.target.value
            setConfigRaw(nextValue)
            validateConfig(nextValue)
          }}
          disabled={isSubmitting}
          helperText={t('providerFormModal.fields.configuration.helper')}
          error={fieldErrors.configuration}
        />
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-bsc-blue-dark dark:text-white">{t('providerFormModal.languages.supportedTitle')}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {t('providerFormModal.languages.summary', { input: inputLanguageIds.length, output: outputLanguageIds.length })}
          </p>
        </div>
        {languagesError && (
          <Alert variant="danger" title={t('providerFormModal.languages.loadErrorTitle')} description={languagesError.message} />
        )}
        {(fieldErrors.inputLanguageIds || fieldErrors.outputLanguageIds) && (
          <Alert
            variant="warning"
            title={t('providerFormModal.languages.selectValidTitle')}
            description={fieldErrors.inputLanguageIds ?? fieldErrors.outputLanguageIds ?? undefined}
          />
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <LanguagePickerPanel
            title={t('providerFormModal.languages.inputTitle')}
            filterValue={inputFilter}
            onFilterChange={setInputFilter}
            languages={filteredInputLanguages}
            selectedIds={inputLanguageIds}
            onToggle={handleToggleInput}
            allSelected={allInputSelected}
            indeterminate={inputIndeterminate}
            onToggleAll={handleToggleAllInput}
            disabled={isSubmitting}
            isLoading={isLoadingLanguages}
            isEmptyDisabled={languages.length === 0}
            allLabel={t('providerFormModal.languages.allLabel')}
            filterPlaceholder={t('providerFormModal.languages.filterPlaceholder')}
            noMatchesText={t('providerFormModal.languages.noMatches')}
          />

          <LanguagePickerPanel
            title={t('providerFormModal.languages.outputTitle')}
            filterValue={outputFilter}
            onFilterChange={setOutputFilter}
            languages={filteredOutputLanguages}
            selectedIds={outputLanguageIds}
            onToggle={handleToggleOutput}
            allSelected={allOutputSelected}
            indeterminate={outputIndeterminate}
            onToggleAll={handleToggleAllOutput}
            disabled={isSubmitting}
            isLoading={isLoadingLanguages}
            isEmptyDisabled={languages.length === 0}
            allLabel={t('providerFormModal.languages.allLabel')}
            filterPlaceholder={t('providerFormModal.languages.filterPlaceholder')}
            noMatchesText={t('providerFormModal.languages.noMatches')}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {t('providerFormModal.languages.helper')}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-6">
        <Switch
          label={isActive ? t('providerFormModal.switches.active') : t('providerFormModal.switches.inactive')}
          checked={isActive}
          onChange={(event) => {
            setIsActive(event.target.checked)
          }}
          disabled={isSubmitting}
        />
        <Switch
          label={isDefault ? t('providerFormModal.switches.default') : t('providerFormModal.switches.notDefault')}
          checked={isDefault}
          onChange={(event) => {
            setIsDefault(event.target.checked)
          }}
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  )
}
