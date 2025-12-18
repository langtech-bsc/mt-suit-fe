import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { TranslatorMode } from '../services/translator.service'

type HighlightSpan = { id: number; start: number; end: number }

export const useGrammarHoverSelection = (params: {
  mode: TranslatorMode
  hoveredId: number | null
  spans: HighlightSpan[]
  textareaRef: RefObject<HTMLTextAreaElement | null>
}) => {
  const selectionRef = useRef<{ start: number; end: number } | null>(null)
  const activeElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (params.mode !== 'grammar') {
      return
    }

    const textarea = params.textareaRef.current
    if (!textarea) {
      return
    }

    if (params.hoveredId === null) {
      const previousSelection = selectionRef.current
      if (!previousSelection) {
        return
      }

      selectionRef.current = null
      const previousActiveElement = activeElementRef.current
      activeElementRef.current = null

      try {
        textarea.setSelectionRange(previousSelection.start, previousSelection.end)
      } catch {
        // noop
      }

      if (previousActiveElement && previousActiveElement !== textarea) {
        try {
          previousActiveElement.focus({ preventScroll: true })
        } catch {
          // noop
        }
      }

      return
    }

    const range = params.spans.find((span) => span.id === params.hoveredId)
    if (!range) {
      return
    }

    if (!selectionRef.current) {
      selectionRef.current = { start: textarea.selectionStart ?? 0, end: textarea.selectionEnd ?? 0 }
      activeElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    }

    try {
      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(range.start, range.end)
    } catch {
      // noop
    }
  }, [params.hoveredId, params.mode, params.spans, params.textareaRef])
}

