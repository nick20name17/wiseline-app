import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { BackButton } from '../-components/back-button'

import { NotificationsList } from './-components/notifications/list'
import { Button } from '@/components/ui/button'

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'error' as const },
    { id: 2, type: 'reminder' as const },
    { id: 3, type: 'warning' as const },
    { id: 4, type: 'new' as const }
  ])

  const deleteAllNotifications = () => {
    setNotifications([])
  }

  return (
    <div className='bg-muted -mx-4 flex h-screen flex-col'>
      <NotificationsTop deleteAllNotifications={deleteAllNotifications} />
      <NotificationsList
        className='mx-4 mt-4'
        notifications={notifications}
        setNotifications={setNotifications}
      />
    </div>
  )
}

export const Route = createFileRoute('/driver/notifications/')({
  component: NotificationsPage
})

const NotificationsTop = ({ deleteAllNotifications }: { deleteAllNotifications: () => void }) => {
  return (
    <div className='bg-background flex h-13 items-center gap-2 border-b px-3.5'>
      <BackButton />

      <h1 className='text-lg font-medium'>Notifications</h1>

      <Button
        onClick={deleteAllNotifications}
        className='ml-auto'
        variant='secondary'
      >
        Clear all
      </Button>
    </div>
  )
}
