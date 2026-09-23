import { SettingsTabs } from '@/components/layout/settings-tabs'
import { Outlet, createFileRoute } from '@tanstack/react-router'

const SettingsLayout = () => (
  // `flex-1` down to the page, so an empty page centres its message in what is left of the screen.
  <div className='flex flex-1 flex-col gap-6'>
    <SettingsTabs />
    <Outlet />
  </div>
)

export const Route = createFileRoute('/_app/_auth/settings')({
  staticData: { crumb: 'Settings' },
  component: SettingsLayout
})
