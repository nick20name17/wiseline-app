import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiErrorWarningFill,
  RiInformationFill,
  RiLoader2Fill
} from '@remixicon/react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = 'light'

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group'
      icons={{
        success: <RiCheckboxCircleFill className='size-4' />,
        info: <RiInformationFill className='size-4' />,
        warning: <RiErrorWarningFill className='size-4' />,
        error: <RiCloseCircleFill className='size-4' />,
        loading: <RiLoader2Fill className='size-4 animate-spin' />
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-md)'
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
