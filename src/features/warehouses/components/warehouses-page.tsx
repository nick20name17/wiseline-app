import { SearchInput } from '@/components/search-input'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useQuery } from '@tanstack/react-query'
import { Warehouse } from 'lucide-react'
import { useRef, useState } from 'react'
import { warehousesQuery } from '../api'
import { CreateWarehouseDialog } from './warehouse-dialog'
import { WarehousesTable } from './warehouses-table'

const SEARCH_DEBOUNCE_MS = 250

type WarehousesPageProps = {
  search: string | undefined
  onSearchChange: (search: string | undefined) => void
}

export const WarehousesPage = ({ search, onSearchChange }: WarehousesPageProps) => {
  const { data: warehouses, isPending } = useQuery(warehousesQuery(search))

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
    <section className='flex flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-end gap-3.5 max-sm:*:last:flex-1'>
        {/* On a phone the add button spans the top line and the search takes the full line below it. */}
        <div className='flex min-w-0 flex-1 items-center gap-3 max-sm:order-1 max-sm:basis-full'>
          <SearchInput
            className='sm:max-w-60'
            label='Search warehouses'
            value={term}
            onValueChange={handleSearch}
          />

          {warehouses?.length ? (
            <p className='shrink-0 text-sm text-muted-foreground'>
              {warehouses.length} {warehouses.length === 1 ? 'warehouse' : 'warehouses'}
            </p>
          ) : null}
        </div>

        <CreateWarehouseDialog />
      </div>

      {!isPending && !warehouses?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Warehouse />
            </EmptyMedia>
            <EmptyTitle>No warehouses yet</EmptyTitle>
            <EmptyDescription>
              {search ? `Nothing matches “${search}”.` : 'Add one to get started.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <WarehousesTable warehouses={warehouses ?? []} isPending={isPending} />
      )}
    </section>
  )
}
