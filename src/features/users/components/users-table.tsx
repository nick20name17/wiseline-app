import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { User } from '../api'
import { roleLabel, roleTint } from '../lib/roles'
import { UserActions } from './user-actions'

// The two name columns render the same way; only the field differs.
const NAME_COLUMNS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' }
] as const

type UsersTableProps = {
  users: User[]
  isPending: boolean
}

export const UsersTable = ({ users, isPending }: UsersTableProps) => (
  <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
    {/* `table-fixed` plus the widths below size the columns from the layout instead of from the
        widest cell, so they hold still between the skeleton, the data and every search. */}
    <Table className='min-w-4xl table-fixed'>
      {/* Email takes the leftover width, since it is the one field that runs long. */}
      <colgroup>
        <col className='w-56' />
        <col className='w-56' />
        <col />
        <col className='w-40' />
        <col className='w-24' />
      </colgroup>
      <TableHeader>
        <TableRow>
          {NAME_COLUMNS.map(column => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
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
              {NAME_COLUMNS.map(column => (
                <TableCell key={column.key}>{user[column.key] || '—'}</TableCell>
              ))}
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${roleTint(user.role)}`}
                >
                  {roleLabel(user.role)}
                </span>
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
