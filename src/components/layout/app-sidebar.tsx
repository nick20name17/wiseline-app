import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar
} from '@/components/ui/sidebar'
import { useIsWide } from '@/hooks/use-mobile'
import { Link } from '@tanstack/react-router'
import { Grid2x2, Layers, PackageCheck, Settings, Truck, Waypoints } from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'DEPARTMENTS',
    items: [
      { to: '/trim', label: 'Trim', icon: Layers },
      { to: '/rollforming', label: 'Rollforming', icon: Waypoints },
      { to: '/accessories', label: 'Accessories', icon: Grid2x2 },
      { to: '/shipping', label: 'Shipping', icon: Truck }
    ]
  },
  {
    label: 'TOOLS',
    items: [
      { to: '/driver', label: 'Driver', icon: Truck },
      { to: '/loading', label: 'Loading', icon: PackageCheck }
    ]
  },
  {
    label: 'MANAGE',
    items: [{ to: '/settings', label: 'Settings', icon: Settings }]
  }
] as const

type AppSidebarProps = {
  /** The pages this user may not open, so their links are not offered. */
  hidden: ReadonlySet<string>
  /**
   * Who the user is is still loading. `hidden` then holds every gated page, and each is drawn as a
   * placeholder row of its own height rather than left out and pushed in once the role arrives.
   */
  pending?: boolean
}

// Lit by the link itself: `useMatchRoute` would re-render the whole sidebar on every search change.
// Non-exact, so Settings stays lit on its sub-pages; search-blind, as a board's tab lives in it.
const ACTIVE = { 'data-active': '' }
const ACTIVE_OPTIONS = { includeSearch: false }

export const AppSidebar = ({ hidden, pending = false }: AppSidebarProps) => {
  const { isMobile, openMobile, setOpen, setOpenMobile } = useSidebar()
  const wide = useIsWide()
  // A phone's drawer and a tablet's opened rail lie over the page; a link that goes there puts them
  // away. A desk's sidebar stays as it is.
  const putAway = () => {
    setOpenMobile(false)
    if (!wide) setOpen(false)
  }

  const nav = (
    <>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' render={<Link to='/' onClick={putAway} />}>
              <img src='/icon-512.png' alt='' className='size-8 flex-none' />
              <div className='grid flex-1 text-left leading-tight'>
                <span className='truncate font-heading font-semibold'>Wiseline</span>
                <span className='truncate text-xs tracking-widest text-muted-foreground uppercase'>
                  Production
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* A group with nothing left to offer goes with its heading. */}
        {NAV_GROUPS.filter(group => pending || group.items.some(item => !hidden.has(item.to))).map(
          group => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(item =>
                    !hidden.has(item.to) ? (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          tooltip={item.label}
                          render={
                            <Link
                              to={item.to}
                              activeProps={ACTIVE}
                              activeOptions={ACTIVE_OPTIONS}
                              onClick={putAway}
                            />
                          }
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : pending ? (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuSkeleton showIcon />
                      </SidebarMenuItem>
                    ) : null
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        )}
      </SidebarContent>
    </>
  )

  // A phone's menu rises from the bottom like its dialogs, where the thumb is, and a swipe down puts
  // it away, where the sidebar's own sheet would slide in from the side.
  if (isMobile)
    return (
      <Drawer open={openMobile} onOpenChange={setOpenMobile} showSwipeHandle>
        <DrawerContent data-sidebar='sidebar'>
          <DrawerTitle className='sr-only'>Menu</DrawerTitle>
          <div className='flex min-h-0 flex-col overflow-y-auto overscroll-contain pb-safe-4'>
            {nav}
          </div>
        </DrawerContent>
      </Drawer>
    )

  return <Sidebar collapsible='icon'>{nav}</Sidebar>
}
