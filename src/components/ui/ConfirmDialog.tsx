import { Button } from './Button'
import { Modal } from './Modal'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  isConfirming?: boolean
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onClose: () => void
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isConfirming = false,
  variant = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) => {
  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isConfirming}>
        {cancelLabel}
      </Button>
      <Button
        variant={variant}
        onClick={onConfirm}
        disabled={isConfirming}
      >
        {isConfirming ? 'Procesando…' : confirmLabel}
      </Button>
    </>
  )

  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer} size="sm">
      <div className="text-sm text-gray-600 dark:text-slate-300">
        {description ?? 'Confirma para continuar.'}
      </div>
    </Modal>
  )
}
