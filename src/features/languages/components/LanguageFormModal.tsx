import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { Alert, Button, Input, Modal, Select, Switch } from '../../../components/ui'
import type { LanguageRecord, LanguageUpsertInput } from '../types'

type Mode = 'create' | 'edit'
type FlagMode = 'url' | 'upload'

const languageSchema = z.object({
  name: z.string().min(2, 'El nombre del idioma es obligatorio.'),
  isoCode: z
    .string()
    .min(2, 'El código ISO es obligatorio.')
    .max(10, 'El código ISO es demasiado largo.')
    .regex(/^[a-zA-Z-]+$/, 'Usa solo letras y guiones.'),
  isActive: z.boolean(),
  flagMode: z.enum(['url', 'upload']),
  flagUrl: z.url('Ingresa una URL válida.').optional().or(z.literal('')),
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
  const [isActive, setIsActive] = useState(true)
  const [flagMode, setFlagMode] = useState<FlagMode>('url')
  const [flagUrl, setFlagUrl] = useState('')
  const [flagFile, setFlagFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setName(language?.name ?? '')
    setIsoCode(language?.isoCode ?? '')
    setIsActive(language?.isActive ?? true)
    setFlagUrl(language?.flagUrl ?? '')
    setFlagFile(null)
    setFlagMode('url')
    setValidationError(null)
  }, [open, language])

  useEffect(() => {
    if (flagMode !== 'upload' || !flagFile) {
      return
    }
    const objectUrl = URL.createObjectURL(flagFile)
    setPreviewUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [flagMode, flagFile])

  const effectivePreview = useMemo(() => {
    if (flagMode === 'upload') {
      return previewUrl
    }
    const candidate = flagUrl.trim()
    return candidate.length > 0 ? candidate : null
  }, [flagMode, previewUrl, flagUrl])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) {
      setFlagFile(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setValidationError('La bandera debe ser una imagen.')
      setFlagFile(null)
      return
    }
    setValidationError(null)
    setFlagFile(file)
    setFlagMode('upload')
  }

  const handleSubmit = () => {
    setValidationError(null)
    const validation = languageSchema.safeParse({
      name,
      isoCode,
      isActive,
      flagMode,
      flagUrl,
    })

    if (!validation.success) {
      setValidationError(validation.error.issues[0]?.message ?? 'Revisa los datos del formulario.')
      return
    }

    const payload: LanguageUpsertInput = {
      name: validation.data.name,
      isoCode: validation.data.isoCode,
      isActive: validation.data.isActive,
      flagUrl: null,
      flagFile: null,
    }

    if (validation.data.flagMode === 'upload') {
      payload.flagFile = flagFile
    } else {
      payload.flagUrl = validation.data.flagUrl?.trim() ? validation.data.flagUrl.trim() : null
    }

    onSubmit(payload)
  }

  let buttonText = ''

  if (isSubmitting) {
    buttonText = 'Guardando…'
  } else if (isEdit) {
    buttonText = 'Guardar cambios'
  } else {
    buttonText = 'Añadir idioma'
  }

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
        {buttonText}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar idioma' : 'Añadir idioma'}
      description={isEdit ? 'Actualiza nombre, código y bandera.' : 'Añade un idioma nuevo disponible para toda la plataforma.'}
      footer={footer}
      size="lg"
    >
      {(validationError || errorMessage) && (
        <Alert variant="danger" title="Revisa el formulario" description={validationError ?? errorMessage ?? undefined} />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input
          label="Nombre del idioma"
          placeholder="Español"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isSubmitting}
        />
        <Input
          label="Código ISO"
          placeholder="es"
          value={isoCode}
          onChange={(event) => setIsoCode(event.target.value)}
          disabled={isSubmitting}
          helperText="Ej: es, en, pt-BR"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <Switch
          label={isActive ? 'Idioma activo' : 'Idioma deshabilitado'}
          description="Los idiomas deshabilitados no aparecen en selectores."
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={isSubmitting}
        />
        <div className="w-full md:w-72">
          <Select
            label="Bandera"
            value={flagMode}
            onChange={(event) => setFlagMode(event.target.value as FlagMode)}
            disabled={isSubmitting}
            options={[
              { value: 'url', label: 'Pegar URL' },
              { value: 'upload', label: 'Subir imagen' },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 ">
        <div className="space-y-3">
          {flagMode === 'url' ? (
            <Input
              label="URL de bandera"
              placeholder="https://…/flag.png"
              value={flagUrl}
              onChange={(event) => setFlagUrl(event.target.value)}
              disabled={isSubmitting}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Subir imagen</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-bsc-blue-medium file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-bsc-blue-dark dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {effectivePreview && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white/40 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-slate-400">
                Previsualización
              </p>
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={effectivePreview}
                  alt={`Bandera ${name || isoCode || ''}`.trim()}
                  className="h-10 w-14 rounded-lg border border-gray-200 object-cover dark:border-slate-700"
                  onError={() => setPreviewUrl(null)}
                />
                <div className="text-sm text-gray-600 dark:text-slate-300">
                  <p className="font-semibold text-bsc-blue-dark dark:text-white">{name || 'Idioma'}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{isoCode || 'Código ISO'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
        <div className="rounded-3xl p-5 bg-transparent">
          <p className="text-sm font-semibold text-bsc-blue-dark dark:text-white">Notas</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600 dark:text-slate-300">
            <li>El código ISO debe ser único.</li>
            <li>Los idiomas activos se muestran en selectores inmediatamente.</li>
          </ul>
        </div>
    </Modal>
  )
}
