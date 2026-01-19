export const DOCUMENT_TRANSLATION_SUPPORTED_EXTENSIONS = ['docx', 'txt'] as const
export type DocumentTranslationSupportedExtension = (typeof DOCUMENT_TRANSLATION_SUPPORTED_EXTENSIONS)[number]

export const DOCUMENT_TRANSLATION_ACCEPT = DOCUMENT_TRANSLATION_SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')
export const DOCUMENT_TRANSLATION_FORMATS_LABEL = DOCUMENT_TRANSLATION_SUPPORTED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(', ')

