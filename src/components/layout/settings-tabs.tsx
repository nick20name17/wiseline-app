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

export const SettingsTabs = () => {
  const pathname = useLocation({ select: location => location.pathname })

  return (
    // The rule runs the full width and the active tab's underline sits on it.
    <div className='border-b border-border'>
      <Tabs value={pathname}>
        <TabsList variant='line' className='overflow-x-auto'>
          {SETTINGS_TABS.map(tab => (
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
      </Tabs>
    </div>
  )
}
