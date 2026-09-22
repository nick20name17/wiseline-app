import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from 'cn'
import type { CSSProperties } from 'react'
import type { Department, Priority } from '../api'
import { PriorityActions } from './priority-actions'

type PrioritiesTableProps = {
  priorities: Priority[]
  departments: Department[] | undefined
  isPending: boolean
}

const wash = (color: string) => `color-mix(in oklch, ${color} 16%, transparent)`

export const PrioritiesTable = ({ priorities, departments, isPending }: PrioritiesTableProps) => (
  <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
    <Table className='min-w-3xl table-fixed'>
      <colgroup>
        <col className='w-64' />
        <col className='w-56' />
        <col className='w-32' />
        <col />
        <col className='w-24' />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>Priority</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Hierarchy</TableHead>
          <TableHead>Colour</TableHead>
          <TableHead>
            {/* The column is obvious from its buttons; the label is for screen readers. */}
            <span className='sr-only'>Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending ? (
          <TableSkeletonRows columns={4} />
        ) : (
          priorities.map(priority => (
            <TableRow key={priority.id}>
              <TableCell>
                {/* Shown as the pill the boards show, since the colour is half of what it is. */}
                <span
                  style={
                    priority.color
                      ? ({
                          '--ink': priority.color,
                          '--wash': wash(priority.color)
                        } as CSSProperties)
                      : undefined
                  }
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium tracking-wider uppercase',
                    priority.color ? 'bg-(--wash) text-(--ink)' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'size-1.5 rounded-full',
                      priority.color ? 'bg-(--ink)' : 'bg-muted-foreground'
                    )}
                  />
                  {priority.name}
                </span>
              </TableCell>
              <TableCell>
                {departments?.find(department => department.id === priority.department)?.name ??
                  '—'}
              </TableCell>
              <TableCell>
                <span className='font-mono'>{priority.position}</span>
              </TableCell>
              <TableCell>
                <span className='font-mono text-muted-foreground'>{priority.color ?? '—'}</span>
              </TableCell>
              <TableCell>
                <PriorityActions priority={priority} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
)
