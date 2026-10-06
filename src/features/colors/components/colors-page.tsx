import { QueryError } from '@/components/query-error'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { Palette, Pencil, Search } from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { colorsQuery, type Color } from '../api'
import { isLinked } from '../lib/suggest'
import type { ColorsShow } from '../lib/search'
import { ColorDialog } from './color-dialog'

const SEARCH_DEBOUNCE_MS = 250

type ColorsPageProps = {
  search: string | undefined
  show: ColorsShow | undefined
  onSearchChange: (search: string | undefined) => void
  onShowChange: (show: ColorsShow) => void
}

/** A colour's swatch, or an empty ring where none is kept. */
const Swatch = ({ hex }: { hex: string | null }) => (
  <span
    aria-hidden
    className='inline-block size-4 shrink-0 rounded-full border border-border bg-(--swatch)'
    style={hex ? ({ '--swatch': hex } as CSSProperties) : undefined}
  />
)

/**
 * The trims' colours and the coils of each. EBMS names a trim's colour and a coil's differently and
 * gives many coils none, so Cutlist Coils can only list a coil the Manager has said is of the cutlist's
 * colour p1 (463,379) — once per coil colour text, or per coil product.
 */
export const ColorsPage = ({ search, show, onSearchChange, onShowChange }: ColorsPageProps) => {
  const { data: colors, isPending, isError, error, refetch } = useQuery(colorsQuery)
  // The input owns the term while typing; the URL catches up once the typing stops.
  const [term, setTerm] = useState(search ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)
  const handleSearch = (value: string) => {
    setTerm(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onSearchChange(value || undefined), SEARCH_DEBOUNCE_MS)
  }
  const [editing, setEditing] = useState<Color | null>(null)

  const unlinkedOnly = show === 'unlinked'
  const query = (search ?? '').trim().toLowerCase()
  const listed = (colors ?? []).filter(
    color =>
      (!unlinkedOnly || !isLinked(color)) && (!query || color.name.toLowerCase().includes(query))
  )
  const unlinked = (colors ?? []).filter(color => !isLinked(color)).length

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-3.5'>
        <InputGroup className='w-60'>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type='search'
            aria-label='Search colors'
            placeholder='Search...'
            value={term}
            onChange={event => handleSearch(event.target.value)}
          />
        </InputGroup>
        <Tabs value={show ?? 'all'} onValueChange={value => onShowChange(value as ColorsShow)}>
          <TabsList>
            <TabsTrigger value='all'>All</TabsTrigger>
            <TabsTrigger value='unlinked'>No coils linked · {unlinked}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isError && !colors ? (
        <QueryError title='The colors did not load' error={error} onRetry={() => void refetch()} />
      ) : !isPending && !listed.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Palette />
            </EmptyMedia>
            <EmptyTitle>No colors</EmptyTitle>
            <EmptyDescription>
              {search ? `Nothing matches “${search}”.` : 'Every color has coils linked.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
          <Table className='min-w-2xl table-fixed'>
            <colgroup>
              <col className='w-72' />
              <col />
              <col className='w-32' />
              <col className='w-16' />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Coil colors</TableHead>
                <TableHead>Coil products</TableHead>
                <TableHead>
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableSkeletonRows columns={3} />
              ) : (
                listed.map(color => (
                  <TableRow key={color.name}>
                    <TableCell>
                      <span className='flex items-center gap-2'>
                        <Swatch hex={color.hex} />
                        <span className='truncate'>{color.name}</span>
                        {color.in_ebms ? null : <Badge variant='muted'>Not in EBMS</Badge>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className='line-clamp-2 break-words text-muted-foreground'>
                        {color.coil_colors.length ? color.coil_colors.join(' · ') : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className='font-mono'>{color.coil_products.length || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <div className='flex justify-end text-muted-foreground'>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          aria-label={`Edit ${color.name}`}
                          onClick={() => setEditing(color)}
                        >
                          <Pencil />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ColorDialog color={editing} onOpenChange={open => !open && setEditing(null)} />
    </section>
  )
}
