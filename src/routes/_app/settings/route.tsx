import { SettingsTabs } from '@/components/layout/settings-tabs'
import { guardPage } from '@/app/pages'
import { managesUsers, meQuery } from '@/features/auth'
import { useQuery } from '@tanstack/react-query'
import { Outlet, createFileRoute } from '@tanstack/react-router'

const SettingsLayout = () => {
  const { data: me } = useQuery(meQuery)
  const hidden = new Set(me && managesUsers(me.role) ? [] : ['/settings/users'])

  return (
    // `flex-1` down to the page, so an empty page centres its message in what is left of the screen.
    <div className='flex flex-1 flex-col gap-6'>
      <SettingsTabs hidden={hidden} />
      <Outlet />
    </div>
  )
}

export const Route = createFileRoute('/_app/settings')({
  staticData: { crumb: 'Settings' },
  beforeLoad: ({ context }) => guardPage(context.queryClient, '/settings'),
  component: SettingsLayout
})
