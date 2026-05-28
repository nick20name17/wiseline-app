import {
  RiAddCircleLine,
  RiAlarmWarningLine,
  RiAlertLine,
  RiErrorWarningLine
} from '@remixicon/react'

import { cn } from '@/lib/utils'

const NOTIFICATIOINS_CONFIG = [
  {
    icon: RiErrorWarningLine,
    type: 'error',
    titleClassname: 'text-destructive',
    containerClassname: 'border-destructive',
    iconContainerClassname: 'bg-destructive/5 [&_svg]:text-destructive'
  },
  {
    icon: RiAlarmWarningLine,
    type: 'reminder',
    titleClassname: 'text-purple-500',
    containerClassname: 'border-border',
    iconContainerClassname: 'bg-purple-50 [&_svg]:text-purple-500'
  },
  {
    icon: RiAlertLine,
    type: 'warning',
    titleClassname: 'text-orange-400',
    containerClassname: 'border-orange-400',
    iconContainerClassname: 'bg-orange-50 [&_svg]:text-orange-400'
  },
  {
    icon: RiAddCircleLine,
    type: 'new',
    titleClassname: 'text-green-400',
    containerClassname: 'border-green-400',
    iconContainerClassname: 'bg-green-50 [&_svg]:text-green-400'
  }
] as const

type NotificationType = (typeof NOTIFICATIOINS_CONFIG)[number]['type']

export interface Notification {
  id: number
  type: NotificationType
}

export const Notification = ({ type }: { type: NotificationType }) => {
  const notificationConfig = NOTIFICATIOINS_CONFIG.find((config) => config.type === type)

  return (
    <div
      className={cn(
        'bg-background flex h-full items-center gap-2 rounded-lg border p-1.5',
        notificationConfig?.containerClassname
      )}
    >
      <div
        className={cn(
          'flex h-full min-h-10.5 w-11.5 items-center justify-center rounded-sm [&_svg]:size-5.5',
          notificationConfig?.iconContainerClassname
        )}
      >
        {notificationConfig?.icon && <notificationConfig.icon />}
      </div>
      <div className='flex flex-1 flex-col gap-1'>
        <div className='flex items-center justify-between gap-2.5'>
          <h3 className={cn('text-sm leading-none font-medium')}>Error!</h3>
          <div className='text-muted-foreground text-[10px] leading-none font-semibold'>
            8 min ago
          </div>
        </div>
        <p className='text-muted-foreground text-sm leading-tight'>
          Delivery #1250 must be delivered by 8:30 AM.
        </p>
      </div>
    </div>
  )
}
