import type { PropsWithChildren } from 'react'
import { createContext, use, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'system'

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'ui-theme'
const DEFAULT_THEME: Theme = 'system'

const isTheme = (value: unknown): value is Theme =>
  value === 'dark' || value === 'light' || value === 'system'

const ThemeProviderContext = createContext<ThemeProviderState | null>(null)

const applyTheme = (theme: Theme) => {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  const style = document.createElement('style')
  style.textContent = '*,*::before,*::after{transition:none!important}'
  document.head.appendChild(style)
  document.documentElement.classList.toggle('dark', resolved === 'dark')

  // flush the transition-disabling style before removing it, so the theme swap doesn't animate
  void window.getComputedStyle(document.documentElement).transition
  setTimeout(() => style.remove(), 1)
}

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : DEFAULT_THEME
  })

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = (next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }

  return <ThemeProviderContext value={{ theme, setTheme }}>{children}</ThemeProviderContext>
}

export const useTheme = () => {
  const ctx = use(ThemeProviderContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}
