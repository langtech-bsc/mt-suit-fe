import type { HTMLAttributes } from 'react'

export interface PageLoaderProps extends HTMLAttributes<HTMLDivElement> {
  message?: string
  fullscreen?: boolean
}

export const PageLoader = ({ message = 'Cargando contenido…', fullscreen = true, className = '', ...props }: PageLoaderProps) => {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-3 ${fullscreen ? 'min-h-[60vh]' : 'py-8'} ${className}`}
      {...props}
    >
      <span className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-bsc-blue-medium border-t-bsc-blue-medium/20" />
      <p className="text-sm font-medium text-bsc-blue-medium">{message}</p>
    </div>
  )
}
