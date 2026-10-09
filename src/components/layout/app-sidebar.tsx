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
  SidebarMenuSkeleton
} from '@/components/ui/sidebar'
import { Link } from '@tanstack/react-router'
import { Grid2x2, Layers, PackageCheck, QrCode, Settings, Truck, Waypoints } from 'lucide-react'

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
    items: [
      { to: '/stock-cards', label: 'Stock Cards', icon: QrCode },
      { to: '/settings', label: 'Settings', icon: Settings }
    ]
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

export const AppSidebar = ({ hidden, pending = false }: AppSidebarProps) => (
  <Sidebar collapsible='icon'>
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' render={<Link to='/' />}>
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
      {NAV_GROUPS.map(group => (
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
                        <Link to={item.to} activeProps={ACTIVE} activeOptions={ACTIVE_OPTIONS} />
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
      ))}
    </SidebarContent>
  </Sidebar>
)
