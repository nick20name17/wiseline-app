import type { ComponentProps, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { House } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'

type StatusPageProps = {
  code: string
  icon: ReactNode
  mediaClassName?: string
  title: string
  description: string
  actions: ReactNode
  children?: ReactNode
}

export const StatusPage = ({
  code,
  icon,
  mediaClassName,
  title,
  description,
  actions,
  children
}: StatusPageProps) => (
  <main className='flex min-h-svh items-center justify-center p-6'>
    <Empty className='max-w-md border-none'>
      <EmptyHeader>
        <EmptyMedia variant='icon' className={mediaClassName}>
          {icon}
        </EmptyMedia>
        <span className='text-muted-foreground font-mono text-xs tracking-widest tabular-nums'>
          {code}
        </span>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className='grid grid-cols-2 gap-2'>{actions}</div>
        {children}
      </EmptyContent>
    </Empty>
  </main>
)

export const BackHomeButton = ({
  variant
}: {
  variant?: ComponentProps<typeof Button>['variant']
}) => (
  <Button render={<Link to='/' />} nativeButton={false} variant={variant}>
    <House data-icon='inline-start' />
    Back home
  </Button>
)
