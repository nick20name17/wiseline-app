'use client'

import * as React from 'react'
import { cn } from 'cn'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot='table-container' className='relative w-full overflow-x-auto'>
      <table
        data-slot='table'
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot='table-header'
      className={cn('bg-muted/50 [&_tr]:border-b [&_tr]:hover:bg-transparent', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot='table-body'
      // The first cell names the row, so it reads as the row's label.
      className={cn('[&_td:first-child]:font-medium [&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot='table-footer'
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot='table-row'
      className={cn(
        // The banding gives the eye a rail to follow across a wide table. It sits on the row, not
        // the body, so every state below is as specific as it is and wins by coming later.
        'h-9 border-b transition-colors even:bg-muted/30 hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted',
        // A line under remanufacture is highlighted whole: orange while a remake is owed, green once
        // every one is back. A late line carries only the overdue mark, so it stays red.
        'data-[reman=done]:bg-success/10 data-[reman=owed]:bg-caution/10',
        // A row the board marks as past due carries the warning across every column, not just the
        // one holding the date. Selection still outranks it: it is the thing being acted on.
        'data-overdue:bg-destructive/5 data-overdue:hover:bg-destructive/10 data-overdue:data-[state=selected]:bg-muted',
        // A cutlist row the floor has signed off is crossed out and stays in place: the list is a
        // record of the cut, not a queue that empties.
        'data-complete:text-muted-foreground data-complete:line-through',
        // A line that belongs to another day is shown for context and left alone: greyed, not struck.
        'data-locked:text-muted-foreground',
        // The first row of a new group under a sort, where the board asks for a distinct line.
        'data-divider:*:border-t-2 data-divider:*:border-t-foreground/15',
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot='table-head'
      className={cn(
        'h-9 px-4 text-left align-middle text-xs font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase [&:has([role=checkbox])]:pr-0',
        // A movable column's header: the one in hand fades, and a bar on the side it will land on
        // marks where it goes; the body cells only move on drop, so the bar is the whole preview.
        'data-dragging:cursor-grabbing data-dragging:opacity-50 data-movable:relative data-movable:cursor-grab data-movable:select-none',
        'data-[drop=before]:before:absolute data-[drop=before]:before:inset-y-0 data-[drop=before]:before:left-0 data-[drop=before]:before:w-0.5 data-[drop=before]:before:bg-primary',
        'data-[drop=after]:after:absolute data-[drop=after]:after:inset-y-0 data-[drop=after]:after:right-0 data-[drop=after]:after:w-0.5 data-[drop=after]:after:bg-primary',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot='table-cell'
      className={cn(
        'overflow-hidden px-4 py-1 align-middle text-ellipsis whitespace-nowrap [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot='table-caption'
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
