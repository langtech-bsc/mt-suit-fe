import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { TranslatorMode } from '../services/translator.service'

type HighlightSpan = { id: number; start: number; end: number }

const restoreSelection = (params: {
  textarea: HTMLTextAreaElement
  selectionRef: React.RefObject<{ start: number; end: number } | null>
  activeElementRef: React.RefObject<HTMLElement | null>
}) => {
  const previousSelection = params.selectionRef.current
  if (!previousSelection) {
    return
  }

  params.selectionRef.current = null
  const previousActiveElement = params.activeElementRef.current
  params.activeElementRef.current = null

  try {
    params.textarea.setSelectionRange(previousSelection.start, previousSelection.end)
  } catch {
    // noop
  }

  if (previousActiveElement && previousActiveElement !== params.textarea) {
    try {
      previousActiveElement.focus({ preventScroll: true })
    } catch {
      // noop
    }
  }
}

const storeCurrentSelection = (params: {
  textarea: HTMLTextAreaElement
  selectionRef: React.RefObject<{ start: number; end: number } | null>
  activeElementRef: React.RefObject<HTMLElement | null>
}) => {
  if (params.selectionRef.current) {
    return
  }
  params.selectionRef.current = { start: params.textarea.selectionStart ?? 0, end: params.textarea.selectionEnd ?? 0 }
  params.activeElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
}

const focusAndSelect = (textarea: HTMLTextAreaElement, start: number, end: number) => {
  try {
    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(start, end)
  } catch {
    // noop
  }
}

const syncGrammarHoverSelection = (params: {
  mode: TranslatorMode
  hoveredId: number | null
  spans: HighlightSpan[]
  textareaRef: RefObject<HTMLTextAreaElement | null>
  selectionRef: React.RefObject<{ start: number; end: number } | null>
  activeElementRef: React.RefObject<HTMLElement | null>
}) => {
  if (params.mode !== 'grammar') {
    return
  }

  const textarea = params.textareaRef.current
  if (!textarea) {
    return
  }

  if (params.hoveredId === null) {
    restoreSelection({ textarea, selectionRef: params.selectionRef, activeElementRef: params.activeElementRef })
    return
  }

  const range = params.spans.find((span) => span.id === params.hoveredId)
  if (!range) {
    return
  }

  storeCurrentSelection({ textarea, selectionRef: params.selectionRef, activeElementRef: params.activeElementRef })
  focusAndSelect(textarea, range.start, range.end)
}

export const useGrammarHoverSelection = (params: {
  mode: TranslatorMode
  hoveredId: number | null
  spans: HighlightSpan[]
  textareaRef: RefObject<HTMLTextAreaElement | null>
}) => {
  const selectionRef = useRef<{ start: number; end: number } | null>(null)
  const activeElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    syncGrammarHoverSelection({
      mode: params.mode,
      hoveredId: params.hoveredId,
      spans: params.spans,
      textareaRef: params.textareaRef,
      selectionRef,
      activeElementRef,
    })
  }, [params.hoveredId, params.mode, params.spans, params.textareaRef])
}
