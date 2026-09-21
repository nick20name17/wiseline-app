import { createContext, use } from 'react'
import * as z from 'zod/mini'

export const themeSchema = z.enum(['dark', 'light', 'system'])

export type Theme = z.infer<typeof themeSchema>

export interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export const useTheme = () => {
  const context = use(ThemeContext)

  if (!context) throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
