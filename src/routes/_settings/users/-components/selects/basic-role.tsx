import { USER_ROLE_BADGE_OPTIONS } from '../badges/user-role'

import { type UserRoles } from '@/api/users/schema'
import type { BasicSelectProps } from '@/components/common/selects/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type BasicUserRoleSelectProps = BasicSelectProps<UserRoles>

export const BasicUserRoleSelect = ({
  value,
  onChange,
  className,
  disabled
}: BasicUserRoleSelectProps) => {
  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={onChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder='Role' />
      </SelectTrigger>
      <SelectContent>
        {USER_ROLE_BADGE_OPTIONS.map(({ value, text, className }) => {
          return (
            <SelectItem
              key={value}
              value={value}
            >
              <div className='flex items-center gap-1.5'>
                <div className={cn('square size-3.5 rounded-full', className)} />
                <span>{text}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
