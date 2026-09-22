import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import { usersQuery } from '../api'
import { CreateUserDialog } from './user-dialog'
import { UsersTable } from './users-table'

const SEARCH_DEBOUNCE_MS = 250

type UsersPageProps = {
  search: string | undefined
  onSearchChange: (search: string | undefined) => void
}

export const UsersPage = ({ search, onSearchChange }: UsersPageProps) => {
  const { data: users, isPending } = useQuery(usersQuery(search))

  // The input owns the term while typing; the URL catches up once the typing stops, so the
  // address bar changes once per pause instead of once per keystroke.
  const [term, setTerm] = useState(search ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (value: string) => {
    setTerm(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onSearchChange(value || undefined), SEARCH_DEBOUNCE_MS)
  }

  return (
    <section className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-3.5'>
        <div className='flex items-center gap-3'>
          <InputGroup className='w-60'>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type='search'
              aria-label='Search users'
              placeholder='Search...'
              value={term}
              onChange={event => handleSearch(event.target.value)}
            />
          </InputGroup>

          {users?.length ? (
            <p className='text-sm text-muted-foreground'>
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </p>
          ) : null}
        </div>

        <CreateUserDialog />
      </div>

      {!isPending && !users?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Users />
            </EmptyMedia>
            <EmptyTitle>No users yet</EmptyTitle>
            <EmptyDescription>
              {search ? `Nothing matches “${search}”.` : 'Add one to get started.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <UsersTable users={users ?? []} isPending={isPending} />
      )}
    </section>
  )
}
