import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Link, useLocation } from '@tanstack/react-router'

const SETTINGS_TABS = [
  { to: '/settings/users', label: 'Users' },
  { to: '/settings/machines', label: 'Machines' },
  { to: '/settings/warehouses', label: 'Warehouses' },
  { to: '/settings/location-types', label: 'Location Types' },
  { to: '/settings/locations', label: 'Locations' },
  { to: '/settings/trucks', label: 'Trucks' },
  { to: '/settings/priorities', label: 'Priorities' },
  { to: '/settings/work-days', label: 'Work Days' }
] as const

type SettingsTabsProps = {
  /** Tabs the user may not open, left out rather than shown and refused. */
  hidden: ReadonlySet<string>
}

export const SettingsTabs = ({ hidden }: SettingsTabsProps) => {
  const pathname = useLocation({ select: location => location.pathname })

  return (
    // The rule runs the full width and the active tab's underline sits on it.
    <div className='border-b border-border'>
      <Tabs value={pathname}>
        {/* The scroll sits on a wrapper rather than on the list, so the first and last tab keep
            their focus ring where the strip has to scroll. */}
        <div className='scrollport overflow-x-auto'>
          <TabsList variant='line'>
            {SETTINGS_TABS.filter(tab => !hidden.has(tab.to)).map(tab => (
              <TabsTrigger
                key={tab.to}
                value={tab.to}
                nativeButton={false}
                render={<Link to={tab.to} />}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  )
}
