import { ThemeContext, themeSchema, type Theme } from '@/components/theme/theme'
import { useEffect, useState } from 'react'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

const THEME_COLOR = { light: '#ffffff', dark: '#0a0a0a' } as const

const resolve = (theme: Theme) =>
  theme === 'system' ? (darkMediaQuery.matches ? 'dark' : 'light') : theme

const applyTheme = (theme: Theme) => {
  const root = document.documentElement
  const resolved = resolve(theme)
  if (root.classList.contains(resolved)) return

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolved])
  root.classList.add('theme-switching')
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  requestAnimationFrame(() => root.classList.remove('theme-switching'))
}

export const ThemeProvider = ({
  children,
  defaultTheme = 'system',
  storageKey = 'theme'
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState(() => {
    return themeSchema.safeParse(localStorage.getItem(storageKey)).data ?? defaultTheme
  })

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return

    const onChange = () => applyTheme('system')
    darkMediaQuery.addEventListener('change', onChange)
    return () => darkMediaQuery.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = (next: Theme) => {
    localStorage.setItem(storageKey, next)
    setThemeState(next)
  }

  const resolvedTheme = resolve(theme)
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext value={{ theme, resolvedTheme, setTheme, toggleTheme }}>{children}</ThemeContext>
  )
}
