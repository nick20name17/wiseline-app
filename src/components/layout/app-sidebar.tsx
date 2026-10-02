import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { Link, useMatchRoute } from '@tanstack/react-router'
import {
  Database,
  Grid2x2,
  Layers,
  PackageCheck,
  QrCode,
  ScanLine,
  Settings,
  Truck,
  Waypoints
} from 'lucide-react'

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
      { to: '/loading', label: 'Loading', icon: PackageCheck },
      { to: '/scanner', label: 'Scanner', icon: ScanLine }
    ]
  },
  {
    label: 'MANAGE',
    items: [
      { to: '/stock-cards', label: 'Stock Cards', icon: QrCode },
      { to: '/ebms', label: 'EBMS', icon: Database },
      { to: '/settings', label: 'Settings', icon: Settings }
    ]
  }
] as const

export const AppSidebar = () => {
  const matchRoute = useMatchRoute()

  return (
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
                {group.items.map(item => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      // Fuzzy, so Settings stays lit on its sub-pages.
                      isActive={!!matchRoute({ to: item.to, fuzzy: true })}
                      tooltip={item.label}
                      render={<Link to={item.to} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
