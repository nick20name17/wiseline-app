import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Database, Search } from 'lucide-react'
import { useState } from 'react'
import { coilSuppliersQuery } from '../api'

const SEARCH_DEBOUNCE_MS = 250
const SKELETON_ROWS = 6

// Mounted only while the dialog is open, so the suppliers are not fetched for a closed window.
const SupplierList = () => {
  const [term, setTerm] = useState('')
  const search = useDebouncedValue(term.trim(), SEARCH_DEBOUNCE_MS)
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(coilSuppliersQuery(search))

  const suppliers = data?.pages.flatMap(page => page.results) ?? []
  const count = data?.pages[0]?.count ?? 0

  return (
    <div className='flex min-h-0 flex-col gap-3'>
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          type='search'
          aria-label='Search coil suppliers'
          placeholder='Search...'
          value={term}
          onChange={event => setTerm(event.target.value)}
        />
      </InputGroup>

      {isPending ? (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: SKELETON_ROWS }, (_, row) => (
            <Skeleton key={row} className='h-6' />
          ))}
        </div>
      ) : isError ? (
        <p className='text-muted-foreground'>The suppliers could not be loaded.</p>
      ) : suppliers.length ? (
        <>
          <p className='text-xs text-muted-foreground'>
            {suppliers.length} of {count} {count === 1 ? 'supplier' : 'suppliers'}
          </p>
          <ul className='max-h-80 overflow-y-auto rounded-lg border border-border'>
            {suppliers.map(({ supplier, name }) => (
              <li
                key={supplier}
                className='flex items-baseline justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0'
              >
                <span className='truncate'>{name ?? supplier}</span>
                {name ? (
                  <span className='shrink-0 font-mono text-xs text-muted-foreground'>
                    {supplier}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {hasNextPage ? (
            <Button
              variant='outline'
              className='self-center'
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? <Spinner data-icon='inline-start' /> : null}
              Load more
            </Button>
          ) : null}
        </>
      ) : (
        <p className='text-muted-foreground'>
          {search ? `No supplier matches “${search}”.` : 'EBMS lists no coil suppliers.'}
        </p>
      )}
    </div>
  )
}

/** The vendors EBMS buys coils from p1 (821,73). Shown, not edited: the list is kept in EBMS. */
export const CoilSuppliersDialog = () => (
  <Dialog>
    <DialogTrigger render={<Button variant='outline' />}>
      <Database data-icon='inline-start' />
      Coil suppliers
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Coil suppliers</DialogTitle>
        <DialogDescription>
          The vendors EBMS lists for coil products. Suppliers are added and removed in EBMS.
        </DialogDescription>
      </DialogHeader>
      <SupplierList />
    </DialogContent>
  </Dialog>
)
