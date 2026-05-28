import { AnimatePresence } from 'motion/react'

import { SwipeToDelete } from '../swipe-to-delete'

import { Notification } from './notification'
import { cn } from '@/lib/utils'

interface NotificationsListProps {
  className?: string
  notifications: Notification[]
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>
}

export const NotificationsList = ({
  className,
  notifications,
  setNotifications
}: NotificationsListProps) => {
  const handleDelete = (id: number) => {
    setNotifications(notifications.filter((n) => n.id !== id))
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <AnimatePresence initial={false}>
        {notifications.map((notification) => (
          <SwipeToDelete
            key={notification.id}
            onDelete={() => handleDelete(notification.id)}
          >
            <Notification type={notification.type} />
          </SwipeToDelete>
        ))}
      </AnimatePresence>
    </div>
  )
}
