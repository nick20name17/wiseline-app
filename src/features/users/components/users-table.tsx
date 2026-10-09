import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from 'cn'
import type { User } from '../api'
import { fullName } from '../lib/name'
import { reachesEveryDepartment, roleLabel, roleTint, toDepartments } from '../lib/roles'
import { UserActions } from './user-actions'

type DepartmentsCellProps = {
  user: User
}

const DepartmentsCell = ({ user }: DepartmentsCellProps) => {
  if (reachesEveryDepartment(user.role)) {
    return <span className='text-muted-foreground'>All departments</span>
  }

  const departments = toDepartments(user)
  if (!departments.length) return <span className='text-muted-foreground'>—</span>

  return (
    <div className='flex gap-1'>
      {departments.map(department => (
        <Badge key={department} variant='muted'>
          {department}
        </Badge>
      ))}
    </div>
  )
}

const COLUMNS = ['Name', 'Email', 'Role', 'Departments'] as const

const ROLE_BADGE =
  'inline-flex h-5 items-center rounded-4xl px-2 text-xs font-medium tracking-wider uppercase'

type UsersTableProps = {
  users: User[]
  isPending: boolean
}

export const UsersTable = ({ users, isPending }: UsersTableProps) => (
  <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
    {/* `table-fixed` plus the widths below size the columns from the layout instead of from the
        widest cell, so they hold still between the skeleton, the data and every search. */}
    <Table className='min-w-4xl table-fixed'>
      {/* Departments take the leftover width, since a user can hold several. */}
      <colgroup>
        <col className='w-64' />
        <col className='w-72' />
        <col className='w-36' />
        <col />
        <col className='w-24' />
      </colgroup>
      <TableHeader>
        <TableRow>
          {COLUMNS.map(label => (
            <TableHead key={label}>{label}</TableHead>
          ))}
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
          users.map(user => (
            <TableRow key={user.id}>
              <TableCell>{fullName(user) || '—'}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {/* The tint is per role, so <Badge> cannot carry it; the shape matches one. */}
                <span className={cn(ROLE_BADGE, roleTint(user.role))}>{roleLabel(user.role)}</span>
              </TableCell>
              <TableCell>
                <DepartmentsCell user={user} />
              </TableCell>
              <TableCell>
                <UserActions user={user} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
)
