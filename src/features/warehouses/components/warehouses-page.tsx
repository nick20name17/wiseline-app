import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { useQuery } from '@tanstack/react-query'
import { Search, Warehouse } from 'lucide-react'
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
    <section className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-3.5'>
        <div className='flex items-center gap-3'>
          <InputGroup className='w-60'>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type='search'
              aria-label='Search warehouses'
              placeholder='Search...'
              value={term}
              onChange={event => handleSearch(event.target.value)}
            />
          </InputGroup>

          {warehouses?.length ? (
            <p className='text-sm text-muted-foreground'>
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
