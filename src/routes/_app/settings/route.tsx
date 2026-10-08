import { SettingsTabs } from '@/components/layout/settings-tabs'
import { homePath, isManagerRole, managesUsers, meQuery } from '@/features/auth'
import { useQuery } from '@tanstack/react-query'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

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
  // A hand-typed URL is sent to the user's own page, the same as the hidden sidebar link.
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!isManagerRole(me.role)) throw redirect({ to: homePath(me), replace: true })
  },
  component: SettingsLayout
})
