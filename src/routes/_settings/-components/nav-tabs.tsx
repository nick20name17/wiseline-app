import { Link, useLocation } from '@tanstack/react-router'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { RouteNames } from '@/types/routes'

const SETTINGS_TABS_OPTIONS = [
  { link: 'users', label: 'Users' },
  { link: 'flows', label: 'Machines' },
  { link: 'locations', label: 'Locations' },
  { link: 'warehouses', label: 'Warehouses' },
  { link: 'trucks', label: 'Trucks' },
  { link: 'priorities', label: 'Priorities' }
] as const

interface SettingsNavTabsProps {
  className?: string
}

export const SettingsNavTabs = ({ className }: SettingsNavTabsProps) => {
  const pathname = useLocation({
    select: ({ pathname }) => pathname as RouteNames
  })

  const currentTab = pathname.split('/').pop() || 'users'

  return (
    <Tabs
      value={currentTab}
      className={className}
    >
      <TabsList>
        {SETTINGS_TABS_OPTIONS.map(({ link, label }) => (
          <TabsTrigger
            value={link}
            key={link}
            asChild
          >
            <Link to={`/${link}`}>{label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
