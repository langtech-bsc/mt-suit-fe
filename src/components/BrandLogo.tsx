import type { HTMLAttributes } from 'react'

type BrandLogoProps = HTMLAttributes<HTMLDivElement> & {
  label?: string
  tagline?: string
  direction?: 'horizontal' | 'vertical'
  textTone?: 'dark' | 'light'
  imgClassName?: string
  showText?: boolean
}


const baseImgClasses = 'h-10 w-auto'

export const BrandLogo = ({
  direction = 'horizontal',
  textTone = 'dark',
  imgClassName = '',
  className = '',
  ...props
}: BrandLogoProps) => {
  return (
    <div
      className={`flex items-center gap-3 ${direction === 'vertical' ? 'flex-col text-center' : 'flex-row'} ${className}`}
      {...props}
    >
      {textTone === 'dark' ? <img
        src="/BSC-blue.svg"
        alt="Barcelona Supercomputing Center logo"
        className={`${baseImgClasses} ${imgClassName}`}
        loading="lazy"
      /> : <img
        src="/BSC-white.svg"
        alt="Barcelona Supercomputing Center logo"
        className={`${baseImgClasses} ${imgClassName}`}
        loading="lazy"
      />}
    </div>
  )
}
