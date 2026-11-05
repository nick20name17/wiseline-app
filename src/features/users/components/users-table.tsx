import { useColumnOrder, type ColumnTable } from '@/components/table/column-order'
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
  if (!departments.length) return null

  return (
    <div className='flex gap-1 max-lg:flex-wrap'>
      {departments.map(department => (
        <Badge key={department} variant='muted'>
          {department}
        </Badge>
      ))}
    </div>
  )
}

// Departments take the leftover width, since a user can hold several.
const COLUMNS: ColumnTable = {
  table: 'users',
  columns: [
    { key: 'name', label: 'Name', width: 'w-48', align: 'start', card: 'title' },
    { key: 'email', label: 'Email or login', width: 'w-72', align: 'start', card: 'subtitle' },
    { key: 'role', label: 'Role', width: 'w-36', minWidth: 152 },
    { key: 'departments', label: 'Departments', align: 'start' }
  ]
}

const ROLE_BADGE =
  'inline-flex h-5 items-center rounded-4xl px-2 text-xs font-medium tracking-wider uppercase'

type UsersTableProps = {
  users: User[]
  isPending: boolean
}

export const UsersTable = ({ users, isPending }: UsersTableProps) => {
  const columns = useColumnOrder(COLUMNS)

  return (
    <div
      data-page-table
      className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'
    >
      {/* `table-fixed` plus the widths below size the columns from the layout instead of from the
        widest cell, so they hold still between the skeleton, the data and every search. */}
      <Table data-cards className='min-w-4xl table-fixed'>
        <colgroup>
          {columns.cols}
          <col className='w-24' />
        </colgroup>
        <TableHeader>
          <TableRow>
            {columns.headers}
            <TableHead>
              {/* The column is obvious from its buttons; the label is for screen readers. */}
              <span className='sr-only'>Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableSkeletonRows actions />
          ) : (
            users.map(user => (
              <TableRow key={user.id}>
                {columns.cells({
                  name: <TableCell>{fullName(user)}</TableCell>,
                  email: <TableCell className='max-lg:break-all'>{user.email}</TableCell>,
                  role: (
                    <TableCell>
                      {/* The tint is per role, so <Badge> cannot carry it; the shape matches one. */}
                      <span className={cn(ROLE_BADGE, roleTint(user.role))}>
                        {roleLabel(user.role)}
                      </span>
                    </TableCell>
                  ),
                  departments: (
                    <TableCell>
                      <DepartmentsCell user={user} />
                    </TableCell>
                  )
                })}
                <TableCell card='trail'>
                  <UserActions user={user} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
