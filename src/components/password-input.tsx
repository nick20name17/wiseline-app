import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/components/ui/input-group'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type * as React from 'react'

type PasswordInputProps = React.ComponentProps<typeof InputGroupInput> & {
  /** Leading icon, where the field needs one — the sign-in form shows a lock. */
  icon?: React.ReactNode
}

/** A password box that can show what was typed, for checking a slip before submitting. */
export const PasswordInput = ({ icon, ...props }: PasswordInputProps) => {
  const [visible, setVisible] = useState(false)

  return (
    <InputGroup>
      {icon ? <InputGroupAddon>{icon}</InputGroupAddon> : null}
      <InputGroupInput type={visible ? 'text' : 'password'} {...props} />
      <InputGroupAddon align='inline-end'>
        <InputGroupButton
          size='icon-xs'
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible(shown => !shown)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
