import { RiEyeCloseLine, RiEyeLine } from '@remixicon/react'
import { useState } from 'react'

import { Input } from '@/components/ui/input'

export const PasswordInput = (props: React.ComponentProps<'input'>) => {
  const [isVisible, setIsVisible] = useState<boolean>(false)

  const toggleVisibility = () => setIsVisible((prevState) => !prevState)

  return (
    <div className='relative'>
      <Input
        className='pe-9'
        placeholder='••••••••'
        {...props}
        type={isVisible ? 'text' : 'password'}
      />
      <button
        className='text-muted-foreground hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-colors outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
        type='button'
        onClick={toggleVisibility}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        aria-controls='password'
      >
        {isVisible ? (
          <RiEyeLine
            className='size-4'
            aria-hidden='true'
          />
        ) : (
          <RiEyeCloseLine
            className='size-4'
            aria-hidden='true'
          />
        )}
      </button>
    </div>
  )
}
