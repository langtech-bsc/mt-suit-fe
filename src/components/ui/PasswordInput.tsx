import { forwardRef, useId, useMemo, useState } from 'react'
import type { InputHTMLAttributes } from 'react'

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  helperText?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const fallbackId = useId()
    const inputId = id ?? fallbackId
    const [visible, setVisible] = useState(false)
    const toggleLabel = useMemo(() => (visible ? 'Ocultar contraseña' : 'Mostrar contraseña'), [visible])

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={`w-full rounded-lg border bg-gray-50 px-4 py-2.5 pr-12 text-slate-900 transition-shadow focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-bsc-blue-medium dark:border-slate-700 dark:focus:ring-bsc-blue-medium'
            } ${className}`}
            {...props}
          />
          <button
            type="button"
            aria-label={toggleLabel}
            onClick={() => setVisible((current) => !current)}
            disabled={props.disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 transition hover:bg-black/5 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-bsc-blue-medium disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {helperText && !error && <span className="text-sm text-gray-500 dark:text-slate-400">{helperText}</span>}
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2.1 12.7c-.1-.2-.1-.5 0-.7C3.6 8.4 7.5 5.5 12 5.5s8.4 2.9 9.9 6.5c.1.2.1.5 0 .7-1.5 3.6-5.4 6.5-9.9 6.5S3.6 16.3 2.1 12.7Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
)

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 6.5 20 19.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M10.7 10.1a3.5 3.5 0 0 0 4.6 4.6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7.4 7.6C5.1 9.1 3.3 10.9 2.1 12.7c-.1.2-.1.5 0 .7 1.5 3.6 5.4 6.5 9.9 6.5 1.6 0 3.1-.3 4.5-.8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M9.3 5.8c.9-.2 1.8-.3 2.7-.3 4.5 0 8.4 2.9 9.9 6.5.1.2.1.5 0 .7-.6 1.4-1.6 2.7-2.9 3.8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
)

