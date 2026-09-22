import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { User } from '../api'
import { fullName } from '../lib/name'
import { DeleteUserDialog } from './delete-user-dialog'
import { UpdateUserDialog } from './user-dialog'

type UserActionsProps = {
  user: User
}

export const UserActions = ({ user }: UserActionsProps) => {
  const [dialog, setDialog] = useState<'update' | 'delete' | null>(null)
  const name = fullName(user) || user.email

  return (
    <div className='flex justify-end gap-1 text-muted-foreground'>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Edit ${name}`}
        onClick={() => setDialog('update')}
      >
        <Pencil />
      </Button>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={`Delete ${name}`}
        onClick={() => setDialog('delete')}
      >
        <Trash2 />
      </Button>

      <UpdateUserDialog
        user={user}
        open={dialog === 'update'}
        onOpenChange={open => setDialog(open ? 'update' : null)}
      />
      <DeleteUserDialog
        user={user}
        open={dialog === 'delete'}
        onOpenChange={open => setDialog(open ? 'delete' : null)}
      />
    </div>
  )
}
