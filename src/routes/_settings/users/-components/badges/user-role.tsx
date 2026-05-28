import type { UserRoles } from '@/api/users/schema'
import type { BadgeOption } from '@/components/common/badges/types'
import { UNKNOWN_OPTION } from '@/components/common/badges/unknow'
import { cn } from '@/lib/utils'

type UserRolesOption = BadgeOption<UserRoles | (string & {})>

export const USER_ROLE_BADGE_OPTIONS: UserRolesOption[] = [
  {
    value: 'admin',
    text: 'Admin',
    className: 'bg-purple-100 text-purple-600 [&_svg]:text-purple-600 [&.square]:bg-purple-600'
  },
  {
    value: 'client',
    text: 'View only',
    className: 'bg-blue-100 text-blue-600 [&_svg]:text-blue-600 [&.square]:bg-blue-600'
  },
  {
    value: 'manager',
    text: 'Manager',
    className: 'bg-amber-100 text-amber-600 [&_svg]:text-amber-600 [&.square]:bg-amber-600'
  },
  {
    value: 'super_manager',
    text: 'Super manager',
    className: 'bg-pink-100 text-pink-600 [&_svg]:text-pink-600 [&.square]:bg-pink-600'
  },
  {
    value: 'worker',
    text: 'Worker',
    className: 'bg-green-100 text-green-600 [&_svg]:text-green-600 [&.square]:bg-green-600'
  },
  {
    value: 'driver',
    text: 'Driver',
    className: 'bg-red-100 text-red-600 [&_svg]:text-red-600 [&.square]:bg-red-600'
  }
]

const getUserRoleOption = (userRole: UserRoles): UserRolesOption =>
  USER_ROLE_BADGE_OPTIONS.find((o) => o.value === userRole) ?? UNKNOWN_OPTION

interface UserRolesBadgeProps {
  userRole: UserRoles
  className?: string
}

export const UserRoleBadge = ({ userRole, className }: UserRolesBadgeProps) => {
  const option = getUserRoleOption(userRole)
  const Icon = option.icon

  return (
    <div
      className={cn(
        'flex w-20 items-center justify-center gap-1 rounded-md px-1.5 py-0.5 text-sm [&_svg]:size-4',
        option.className,
        className
      )}
    >
      {Icon ? <Icon /> : null}
      <span>{option.text}</span>
    </div>
  )
}
