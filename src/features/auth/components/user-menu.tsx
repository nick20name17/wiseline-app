import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsAuthenticated } from '@/lib/session-store'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { logout, meQuery } from '../api'

export const UserMenu = () => {
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()
  const { data: user, isPending } = useQuery({ ...meQuery, enabled: isAuthenticated })

  if (!isAuthenticated) {
    return (
      <Link to='/login' className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Log in
      </Link>
    )
  }

  // The header is the same height either way, so the disc holds its place while /me resolves.
  if (isPending) {
    return (
      <div className='size-8 overflow-hidden rounded-full'>
        <Skeleton className='size-full' />
      </div>
    )
  }

  if (!user) return null

  const initials = (user.first_name.charAt(0) + user.last_name.charAt(0)).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label='Account'>
        <Avatar>
          <AvatarFallback variant='primary'>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' sideOffset={4} className='min-w-56'>
        <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
          <Avatar>
            <AvatarFallback variant='primary'>{initials}</AvatarFallback>
          </Avatar>
          <div className='grid flex-1 leading-tight'>
            <span className='truncate font-medium'>
              {user.first_name} {user.last_name}
            </span>
            <span className='truncate text-xs text-muted-foreground'>{user.email}</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              logout()
              void navigate({ to: '/', replace: true })
            }}
          >
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
