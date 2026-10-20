import { SearchInput } from '@/components/search-input'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useQuery } from '@tanstack/react-query'
import { Truck } from 'lucide-react'
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
    <section className='flex flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-end gap-3.5 max-sm:*:last:flex-1'>
        {/* On a phone the add button spans the top line and the search takes the full line below it. */}
        <div className='flex min-w-0 flex-1 items-center gap-3 max-sm:order-1 max-sm:basis-full'>
          <SearchInput
            className='sm:max-w-60'
            label='Search trucks'
            value={term}
            onValueChange={handleSearch}
          />

          {trucks?.length ? (
            <p className='shrink-0 text-sm text-muted-foreground'>
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
            <EmptyTitle>No trucks yet</EmptyTitle>
            <EmptyDescription>
              {search ? `Nothing matches “${search}”.` : 'Add one to get started.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <TrucksTable trucks={trucks ?? []} isPending={isPending} />
      )}
    </section>
  )
}
