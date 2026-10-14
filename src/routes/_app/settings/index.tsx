import { managesUsers, meQuery } from '@/features/auth'
import { createFileRoute, redirect } from '@tanstack/react-router'

// Settings is only ever its tabs; the first one the user may open stands in for the section itself.
export const Route = createFileRoute('/_app/settings/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    throw redirect({
      to: managesUsers(me.role) ? '/settings/users' : '/settings/machines',
      replace: true
    })
  }
})
