import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Input, Modal, Switch } from '../../../components/ui'
import type { LanguageRecord, LanguageUpsertInput } from '../types'

type Mode = 'create' | 'edit'

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
  const { t } = useTranslation()
  const isEdit = mode === 'edit'
  const [name, setName] = useState('')
  const [isoCode, setIsoCode] = useState('')
  const [nativeName, setNativeName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const languageSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('languageFormModal.validation.nameRequired')),
        isoCode: z
          .string()
          .min(2, t('languageFormModal.validation.isoRequired'))
          .max(10, t('languageFormModal.validation.isoTooLong'))
          .regex(/^[a-zA-Z-]+$/, t('languageFormModal.validation.isoRegex')),
        nativeName: z.string().optional(),
        sortOrder: z.number().int().min(0, t('languageFormModal.validation.orderMin')),
        isActive: z.boolean(),
      }),
    [t],
  )

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
          next.name = validation.error.issues[0]?.message ?? t('languageFormModal.validation.nameRequired')
        } else {
          delete next.name
        }
        return next
      }

      if (field === 'isoCode') {
        const validation = languageSchema.shape.isoCode.safeParse(value)
        if (!validation.success) {
          next.isoCode = validation.error.issues[0]?.message ?? t('languageFormModal.validation.isoRequired')
        } else {
          delete next.isoCode
        }
        return next
      }

      if (field === 'nativeName') {
        const validation = languageSchema.shape.nativeName.safeParse(value)
        if (!validation.success) {
          next.nativeName = validation.error.issues[0]?.message ?? t('languageFormModal.validation.nativeInvalid')
        } else {
          delete next.nativeName
        }
        return next
      }

      const validation = languageSchema.shape.sortOrder.safeParse(value)
      if (!validation.success) {
        next.sortOrder = validation.error.issues[0]?.message ?? t('languageFormModal.validation.orderMin')
      } else {
        delete next.sortOrder
      }
      return next
    })
  }, [languageSchema.shape.isoCode, languageSchema.shape.name, languageSchema.shape.nativeName, languageSchema.shape.sortOrder, t])

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
      setValidationError(validation.error.issues[0]?.message ?? t('languageFormModal.validation.formInvalid'))
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

  const submitButtonText = isEdit ? t('languageFormModal.buttons.saveChanges') : t('languageFormModal.buttons.add')

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        {t('languageFormModal.buttons.cancel')}
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? t('languageFormModal.buttons.saving') : submitButtonText}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('languageFormModal.titleEdit') : t('languageFormModal.titleCreate')}
      description={isEdit ? t('languageFormModal.descriptionEdit') : t('languageFormModal.descriptionCreate')}
      footer={footer}
      size="lg"
    >
      {(validationError || errorMessage) && (
        <Alert variant="danger" title={t('languageFormModal.alertTitle')} description={validationError ?? errorMessage ?? undefined} />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input
          label={t('languageFormModal.fields.nameLabel')}
          placeholder={t('languageFormModal.fields.namePlaceholder')}
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
          label={t('languageFormModal.fields.isoLabel')}
          placeholder={t('languageFormModal.fields.isoPlaceholder')}
          value={isoCode}
          onChange={(event) => {
            const nextValue = event.target.value
            setIsoCode(nextValue)
            validateField('isoCode', nextValue)
          }}
          disabled={isSubmitting}
          helperText={isEdit ? t('languageFormModal.fields.isoHelperEdit') : t('languageFormModal.fields.isoHelperCreate')}
          error={fieldErrors.isoCode}
        />
        <Input
          label={t('languageFormModal.fields.nativeLabel')}
          placeholder={t('languageFormModal.fields.nativePlaceholder')}
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
          label={t('languageFormModal.fields.orderLabel')}
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
          label={isActive ? t('languageFormModal.switch.active') : t('languageFormModal.switch.inactive')}
          description={t('languageFormModal.switch.description')}
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
