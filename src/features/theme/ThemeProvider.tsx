/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  themeState: Theme
  setTheme: (themeState: Theme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'bsc-themeState'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const getPreferredTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeState, setThemeState] = useState<Theme>(() => getPreferredTheme())

  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    root.classList.toggle('dark', themeState === 'dark')
    root.dataset.themeState = themeState
    window.localStorage.setItem(STORAGE_KEY, themeState)
  }, [themeState])

  const setTheme = (next: Theme) => setThemeState(next)
  const toggleTheme = () => {
    setThemeState((previous) => (previous === 'dark' ? 'light' : 'dark'))
  }

  const value = useMemo(() => ({ themeState, setTheme, toggleTheme }), [themeState])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
