import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { useQuery } from '@tanstack/react-query'
import { Search, Truck } from 'lucide-react'
import { useRef, useState } from 'react'
import { trucksQuery } from '../api'
import { CreateTruckDialog } from './truck-dialog'
import { TrucksTable } from './trucks-table'

const SEARCH_DEBOUNCE_MS = 250

type TrucksPageProps = {
  search: string | undefined
  onSearchChange: (search: string | undefined) => void
}

export const TrucksPage = ({ search, onSearchChange }: TrucksPageProps) => {
  const { data: trucks, isPending } = useQuery(trucksQuery(search))

  // The input owns the term while typing; the URL catches up once the typing stops, so the
  // query key changes once per pause instead of once per keystroke.
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
              aria-label='Search trucks'
              placeholder='Search...'
              value={term}
              onChange={event => handleSearch(event.target.value)}
            />
          </InputGroup>

          {trucks?.length ? (
            <p className='text-sm text-muted-foreground'>
              {trucks.length} {trucks.length === 1 ? 'truck' : 'trucks'}
            </p>
          ) : null}
        </div>

        <CreateTruckDialog />
      </div>

      {!isPending && !trucks?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Truck />
            </EmptyMedia>
            <EmptyTitle>No trucks</EmptyTitle>
            <EmptyDescription>
              {search ? `Nothing matches “${search}”.` : 'Create the first truck to get started.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <TrucksTable trucks={trucks ?? []} isPending={isPending} />
      )}
    </section>
  )
}
