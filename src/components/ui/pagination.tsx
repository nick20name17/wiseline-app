import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiMoreFill,
  RiSkipBackLine,
  RiSkipForwardLine
} from '@remixicon/react'
import type { VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => {
  return (
    <nav
      role='navigation'
      aria-label='pagination'
      data-slot='pagination'
      className={cn('flex', className)}
      {...props}
    />
  )
}

const PaginationContent = ({ className, ...props }: React.ComponentProps<'ul'>) => {
  return (
    <ul
      data-slot='pagination-content'
      className={cn('flex flex-row items-center gap-4', className)}
      {...props}
    />
  )
}

const PaginationItem = ({ ...props }: React.ComponentProps<'li'>) => {
  return (
    <li
      data-slot='pagination-item'
      {...props}
    />
  )
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>

const PaginationLink = ({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) => {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot='pagination-link'
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size
        }),
        className
      )}
      {...props}
    />
  )
}

const PaginationPrevious = ({
  className,
  variant = 'outline',
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  variant?: VariantProps<typeof buttonVariants>['variant']
}) => {
  return (
    <PaginationLink
      aria-label='Go to previous page'
      size='icon'
      className={cn(buttonVariants({ variant, size: 'icon' }), 'gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <RiArrowLeftSLine />
      <span className='hidden'>Previous</span>
    </PaginationLink>
  )
}

const PaginationFirst = ({
  className,
  variant = 'outline',
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  variant?: VariantProps<typeof buttonVariants>['variant']
}) => {
  return (
    <PaginationLink
      aria-label='Go to first page'
      className={cn(buttonVariants({ variant, size: 'icon' }), 'gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <RiSkipBackLine />
      <span className='hidden'>First</span>
    </PaginationLink>
  )
}

const PaginationNext = ({
  className,
  variant = 'outline',
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  variant?: VariantProps<typeof buttonVariants>['variant']
}) => {
  return (
    <PaginationLink
      aria-label='Go to next page'
      className={cn(buttonVariants({ variant, size: 'icon' }), 'gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className='hidden'>Next</span>
      <RiArrowRightSLine />
    </PaginationLink>
  )
}

const PaginationLast = ({
  className,
  variant = 'outline',
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  variant?: VariantProps<typeof buttonVariants>['variant']
}) => {
  return (
    <PaginationLink
      aria-label='Go to last page'
      className={cn(buttonVariants({ variant, size: 'icon' }), 'gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className='hidden'>Last</span>
      <RiSkipForwardLine />
    </PaginationLink>
  )
}

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => {
  return (
    <span
      aria-hidden
      data-slot='pagination-ellipsis'
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <RiMoreFill className='size-4' />
      <span className='sr-only'>More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
}
