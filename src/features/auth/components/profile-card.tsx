import { Fact } from '@/components/fact'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useSuspenseQuery } from '@tanstack/react-query'
import { logout, meQuery } from '../api'

type ProfileCardProps = {
  onLogout: () => void
}

export const ProfileCard = ({ onLogout }: ProfileCardProps) => {
  const { data: user } = useSuspenseQuery(meQuery)

  const logoutAndNotify = () => {
    logout()
    onLogout()
  }

  return (
    <div className='flex flex-col gap-8'>
      <header className='flex flex-col gap-2'>
        <h1 className='font-heading text-3xl font-semibold tracking-tight'>Profile</h1>
        <p className='text-muted-foreground'>Loaded from a JWT-protected endpoint.</p>
      </header>

      <section className='flex items-center gap-6 border border-border p-6'>
        <Avatar className='size-16'>
          <AvatarFallback>
            {user.first_name[0]}
            {user.last_name[0]}
          </AvatarFallback>
        </Avatar>
        <dl className='grid flex-1 grid-cols-2 gap-x-8 gap-y-4 text-sm'>
          <Fact label='Name' value={`${user.first_name} ${user.last_name}`} />
          <Fact label='Role' value={user.role} />
          <Fact label='Email' value={user.email} />
          <Fact label='User id' value={String(user.id)} />
        </dl>
      </section>

      <Button variant='outline' className='self-start' onClick={logoutAndNotify}>
        Log out
      </Button>
    </div>
  )
}
