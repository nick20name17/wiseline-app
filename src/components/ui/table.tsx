import * as React from 'react'

import { cn } from '@/lib/utils'

const Table = ({ className, ...props }: React.ComponentProps<'table'>) => {
  return (
    <div
      data-slot='table-container'
      className='w-full'
    >
      <table
        data-slot='table'
        className={cn(
          'w-full table-fixed caption-bottom border-separate border-spacing-0 text-[13px]',
          className
        )}
        {...props}
      />
    </div>
  )
}

const TableHeader = ({ className, ...props }: React.ComponentProps<'thead'>) => {
  return (
    <thead
      data-slot='table-header'
      className={cn('[&_tr]:border-b', className)}
      {...props}
    />
  )
}

const TableBody = ({ className, ...props }: React.ComponentProps<'tbody'>) => {
  return (
    <tbody
      data-slot='table-body'
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

const TableFooter = ({ className, ...props }: React.ComponentProps<'tfoot'>) => {
  return (
    <tfoot
      data-slot='table-footer'
      className={cn('bg-muted border-t [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

const TableRow = ({ className, ...props }: React.ComponentProps<'tr'>) => {
  return (
    <tr
      data-slot='table-row'
      className={cn('data-[state=selected]:bg-muted border-b transition-colors', className)}
      {...props}
    />
  )
}

const TableHead = ({ className, ...props }: React.ComponentProps<'th'>) => {
  return (
    <th
      data-slot='table-head'
      className={cn(
        'text-muted-foreground bg-muted h-(--table-row-height) px-1.5 text-left align-middle font-normal whitespace-nowrap not-last:border-r',
        className
      )}
      {...props}
    />
  )
}

const TableCell = ({ className, ...props }: React.ComponentProps<'td'>) => {
  return (
    <td
      data-slot='table-cell'
      className={cn('h-(--table-row-height) px-1.5 py-0 align-middle not-last:border-r', className)}
      {...props}
    />
  )
}

const TableCaption = ({ className, ...props }: React.ComponentProps<'caption'>) => {
  return (
    <caption
      data-slot='table-caption'
      className={cn('text-grey-500 mt-4 text-sm', className)}
      {...props}
    />
  )
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow }
