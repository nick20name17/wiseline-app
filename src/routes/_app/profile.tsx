import { meQuery, ProfileCard } from '@/features/auth'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

const ProfileRoute = () => {
  const navigate = useNavigate()
  return <ProfileCard onLogout={() => void navigate({ to: '/', replace: true })} />
}

export const Route = createFileRoute('/_app/profile')({
  staticData: { crumb: 'Profile' },
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: ProfileRoute
})
