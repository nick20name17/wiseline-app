import { Moon, Sun } from 'lucide-react'

import { useTheme } from '@/components/theme/theme'
import { Button } from '@/components/ui/button'

export const ModeToggle = () => {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <Button
      variant='outline'
      size='icon-sm'
      onClick={toggleTheme}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <Sun className='size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90' />
      <Moon className='absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0' />
    </Button>
  )
}
