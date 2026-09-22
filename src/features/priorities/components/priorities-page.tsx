import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { useQuery } from '@tanstack/react-query'
import { Flag, Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { departmentsQuery, prioritiesQuery } from '../api'
import { PrioritiesTable } from './priorities-table'
import { CreatePriorityDialog } from './priority-dialog'

const SEARCH_DEBOUNCE_MS = 250

type PrioritiesPageProps = {
  search: string | undefined
  onSearchChange: (search: string | undefined) => void
}

/**
 * The priorities every board sorts by. They are created per department and never leave it, so the
 * department is a column here rather than a filter — this is the one place all of them are visible.
 */
export const PrioritiesPage = ({ search, onSearchChange }: PrioritiesPageProps) => {
  const { data: priorities, isPending } = useQuery(prioritiesQuery(search))
  const { data: departments } = useQuery(departmentsQuery)

  // The input owns the term while typing; the URL catches up once the typing stops.
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
              aria-label='Search priorities'
              placeholder='Search...'
              value={term}
              onChange={event => handleSearch(event.target.value)}
            />
          </InputGroup>

          {priorities?.length ? (
            <p className='text-sm text-muted-foreground'>
              {priorities.length} {priorities.length === 1 ? 'priority' : 'priorities'}
            </p>
          ) : null}
        </div>

        <CreatePriorityDialog />
      </div>

      {!isPending && !priorities?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Flag />
            </EmptyMedia>
            <EmptyTitle>No priorities</EmptyTitle>
            <EmptyDescription>
              {search
                ? `Nothing matches “${search}”.`
                : 'Create the first one; a department with none sorts by date alone.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <PrioritiesTable
          priorities={priorities ?? []}
          departments={departments}
          isPending={isPending}
        />
      )}
    </section>
  )
}
