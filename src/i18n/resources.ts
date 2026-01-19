import { common as enCommon } from './locales/en/common'
import { common as esCommon } from './locales/es/common'
import { common as caCommon } from './locales/ca/common'

export const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
  ca: { common: caCommon },
} as const
