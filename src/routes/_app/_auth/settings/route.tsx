import { SettingsTabs } from '@/components/layout/settings-tabs'
import { Outlet, createFileRoute } from '@tanstack/react-router'

const SettingsLayout = () => (
  <div className='flex flex-col gap-6'>
    <SettingsTabs />
    <Outlet />
  </div>
)

export const Route = createFileRoute('/_app/_auth/settings')({
  staticData: { crumb: 'Settings' },
  component: SettingsLayout
})
