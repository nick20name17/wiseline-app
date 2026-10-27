import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar
} from '@/components/ui/sidebar'
import { useIsAuthenticated } from '@/lib/session-store'
import { useQuery } from '@tanstack/react-query'
import { ChevronsUpDown, LogOut } from 'lucide-react'
import { logout, meQuery } from '../api'

type User = { first_name: string; last_name: string; email: string }

const Who = ({ user }: { user: User }) => (
  <>
    <Avatar>
      <AvatarFallback variant='primary'>
        {(user.first_name.charAt(0) + user.last_name.charAt(0)).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span className='grid flex-1 text-left text-sm leading-tight'>
      <span className='truncate font-medium'>
        {user.first_name} {user.last_name}
      </span>
      <span className='truncate text-xs text-muted-foreground'>{user.email}</span>
    </span>
  </>
)

/** Who is signed in, at the foot of the sidebar, opening into the account's actions. */
export const UserMenu = () => {
  const isAuthenticated = useIsAuthenticated()
  const { data: user, isPending } = useQuery({ ...meQuery, enabled: isAuthenticated })
  const { isMobile } = useSidebar()

  // The shell is signed-in only; for the moment between logging out and the redirect there is no menu.
  if (!isAuthenticated) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isPending ? (
          // The row holds its height while /me resolves.
          <SidebarMenuSkeleton showIcon className='h-12' />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton size='lg' tooltip={`${user.first_name} ${user.last_name}`} />
              }
            >
              <Who user={user} />
              <ChevronsUpDown className='ml-auto size-4' />
            </DropdownMenuTrigger>

            {/* Beside the rail on a desk; above the row on a phone, whose menu rises from the bottom. */}
            <DropdownMenuContent
              side={isMobile ? 'top' : 'right'}
              align='end'
              sideOffset={4}
              className='min-w-56'
            >
              <div className='flex items-center gap-2 px-1 py-1.5'>
                <Who user={user} />
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  // The guard takes the page to sign in once the session is gone, and back here after.
                  onClick={logout}
                >
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
