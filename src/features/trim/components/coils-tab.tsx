import { useColumnOrder } from '@/components/table/column-order'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
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
import { toggled } from '@/lib/sets'
import { useRetained } from '@/lib/use-retained'
import { cn } from 'cn'
import { ChevronRight, Database, Search, SlidersHorizontal } from 'lucide-react'
import { Fragment, useRef, useState, type ReactNode } from 'react'
import { useSetCoilLocation, useTrimCoils, useUpdateCoilLot, type CoilLot } from '../api'
import { COIL_GROUPS_TABLE } from '../lib/columns'
import { coilFilterActive, coilName } from '../lib/coils'
import { CoilAdjustDialog, type CoilFigure } from './coil-adjust-dialog'
import { CoilFilterDialog } from './coil-filter-dialog'
import { ConfirmDialog } from './confirm-dialog'

// Long enough to catch a word, short enough that leaving the tab rarely beats it.
const NOTE_SAVE_MS = 600

const numberFormat = new Intl.NumberFormat('en-US')

const figure = (value: number | null) => (value === null ? '—' : numberFormat.format(value))

// A lot carries no colour yet (see TODO.md), so product and coil # are what there is to search.
const matches = (lot: CoilLot, term: string) =>
  `${lot.product_id ?? ''} ${lot.lot_number ?? ''}`.toLowerCase().includes(term)

// The board reads by colour, then product, then coil #; colour is the one the lot does not carry.
const byProductThenCoil = (a: CoilLot, b: CoilLot) =>
  (a.product_id ?? '').localeCompare(b.product_id ?? '') ||
  (a.lot_number ?? '').localeCompare(b.lot_number ?? '')

/** The two lists the board keeps: the coils standing in this department, and the plant's whole stock. */
type CoilScope = 'trim' | 'all'

type Department = 'in_trim' | 'in_rollforming'

const DEPARTMENT_LABEL: Record<Department, string> = {
  in_trim: 'Trim',
  in_rollforming: 'Rollforming'
}

const otherOf = (department: Department): Department =>
  department === 'in_trim' ? 'in_rollforming' : 'in_trim'

/**
 * One size of coil. The board sizes a coil by Product ID, Color and Width; the lot only carries the
 * Product ID so far (see TODO.md), which is what the rows group on.
 */
type CoilGroup = { key: string; productId: string | null; lots: CoilLot[] }

const groupsOf = (lots: CoilLot[]) => {
  const groups = new Map<string, CoilGroup>()
  for (const lot of lots) {
    const key = lot.product_id ?? ''
    const group = groups.get(key) ?? { key, productId: lot.product_id, lots: [] }
    group.lots.push(lot)
    groups.set(key, group)
  }
  return [...groups.values()]
}

const total = (lots: CoilLot[], key: 'linear_feet' | 'weight') =>
  lots.reduce((sum, lot) => sum + (lot[key] ?? 0), 0)

type NoteCellProps = { lot: CoilLot }

/** The coil's own note, saved as it is typed. */
const NoteCell = ({ lot }: NoteCellProps) => {
  const saved = lot.note ?? ''
  const [draft, setDraft] = useState(saved)
  const [seen, setSeen] = useState(saved)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const update = useUpdateCoilLot()

  // The note changed on the server — another screen, or this one a moment ago. It is taken in unless
  // there is typing here the server has not had yet.
  if (saved !== seen) {
    setSeen(saved)
    if (draft === seen) setDraft(saved)
  }

  const save = (note: string) => {
    clearTimeout(timer.current)
    timer.current = undefined
    update.mutate({ lotId: lot.id, edit: { note } })
  }

  return (
    <Input
      aria-label={`Note on coil ${coilName(lot)}`}
      placeholder='Add note…'
      value={draft}
      onChange={event => {
        const note = event.target.value
        setDraft(note)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => save(note), NOTE_SAVE_MS)
      }}
      onBlur={() => timer.current !== undefined && save(draft)}
    />
  )
}

type LotCellsProps = {
  lot: CoilLot
  onAdjust: (lot: CoilLot, focus: CoilFigure) => void
  onTick: (lot: CoilLot, department: Department, checked: boolean) => void
  onSlinet: (lot: CoilLot, checked: boolean) => void
}

const FIGURES: { key: CoilFigure; label: string }[] = [
  { key: 'coil_thickness', label: 'Coil Thickness' },
  { key: 'linear_feet', label: 'Linear Feet' },
  { key: 'weight', label: 'Weight' }
]

/** The cells every lot row has, whether it hangs under its size or stands in the flat list. */
const LotCells = ({ lot, onAdjust, onTick, onSlinet }: LotCellsProps) => {
  const rollformingShut = !lot.in_rollforming && !lot.rollforming_available
  const slinetShut = !lot.in_slinet && !lot.slinet_available

  return (
    <>
      <TableCell>
        <span className='font-mono'>{lot.lot_number ?? '—'}</span>
      </TableCell>
      {/* The three figures are one control: clicking any of them opens the window that works the
          other two out, with the cursor in the one clicked. */}
      {FIGURES.map(({ key, label }) => (
        <TableCell key={key}>
          <Button
            variant='link'
            aria-label={`Adjust ${label} of coil ${coilName(lot)}`}
            title='Click to open the Coil Adjustment window'
            onClick={() => onAdjust(lot, key)}
          >
            <span className='font-mono'>{figure(lot[key])}</span>
          </Button>
        </TableCell>
      ))}
      <TableCell>
        {/* The hint sits on a wrapper: a disabled control never shows its own. */}
        <span
          className='inline-flex'
          title={
            rollformingShut && lot.in_slinet
              ? 'Coil is mounted in the Slinet — take it off the Slinet first'
              : undefined
          }
        >
          <Checkbox
            aria-label={`Rollforming holds coil ${coilName(lot)}`}
            checked={lot.in_rollforming}
            disabled={rollformingShut}
            onCheckedChange={checked => onTick(lot, 'in_rollforming', checked)}
          />
        </span>
      </TableCell>
      <TableCell>
        <Checkbox
          aria-label={`Trim holds coil ${coilName(lot)}`}
          checked={lot.in_trim}
          onCheckedChange={checked => onTick(lot, 'in_trim', checked)}
        />
      </TableCell>
      <TableCell>
        {/* The Slinet sits inside Trim and needs a Coil Thickness before it opens. */}
        <span
          className='inline-flex'
          title={slinetShut ? 'Needs the coil in Trim and a Coil Thickness' : undefined}
        >
          <Checkbox
            aria-label={`Slinet holds coil ${coilName(lot)}`}
            checked={lot.in_slinet}
            disabled={slinetShut}
            onCheckedChange={checked => onSlinet(lot, checked)}
          />
        </span>
      </TableCell>
      <TableCell>
        <NoteCell lot={lot} />
      </TableCell>
    </>
  )
}

/** The lot columns' head, two rows deep: «Location» spans the three departments a coil can be in. */
const LotHead = ({ lead }: { lead?: string }) => (
  <TableHeader>
    <TableRow>
      {lead ? <TableHead rowSpan={2}>{lead}</TableHead> : null}
      <TableHead rowSpan={2}>Coil #</TableHead>
      <TableHead rowSpan={2}>Coil Thickness</TableHead>
      <TableHead rowSpan={2}>Linear Feet</TableHead>
      <TableHead rowSpan={2}>Weight (lbs.)</TableHead>
      <TableHead colSpan={3} className='text-center'>
        Location
      </TableHead>
      <TableHead rowSpan={2}>Note</TableHead>
    </TableRow>
    <TableRow>
      <TableHead>Rollforming</TableHead>
      <TableHead>Trim</TableHead>
      <TableHead>Slinet In / Out</TableHead>
    </TableRow>
  </TableHeader>
)

/** Column widths shared by both lot tables, so a lot reads the same under its size and on its own. */
const LotColumns = () => (
  <>
    <col className='w-32' />
    <col className='w-36' />
    <col className='w-32' />
    <col className='w-32' />
    {/* Each of these columns is headed by a word longer than the box under it, and the heading is
        what sets the width. */}
    <col className='w-32' />
    <col className='w-20' />
    <col className='w-36' />
    <col />
  </>
)

type CellHandlers = Omit<LotCellsProps, 'lot'>

type CoilTableProps = CellHandlers & { coils: CoilLot[]; loading: boolean }

/** One row per coil, with the size it belongs to spelled out in front — the list read for coil #s. */
const CoilList = ({ coils, loading, ...handlers }: CoilTableProps) => (
  <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
    <Table className='min-w-6xl table-fixed'>
      <colgroup>
        <col className='w-36' />
        <LotColumns />
      </colgroup>
      <LotHead lead='Product ID' />
      <TableBody>
        {loading ? (
          <TableSkeletonRows columns={8} />
        ) : (
          coils.map(lot => (
            <TableRow key={lot.id}>
              <TableCell>
                <span className='font-mono'>{lot.product_id ?? '—'}</span>
              </TableCell>
              <LotCells lot={lot} {...handlers} />
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
)

/** One row per size with its totals; a row opens into the coils of that size. */
const SizeGrid = ({ coils, loading, ...handlers }: CoilTableProps) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const columns = useColumnOrder(COIL_GROUPS_TABLE)

  const toggle = (key: string) => setExpanded(current => toggled(current, key))

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      <Table className='min-w-6xl table-fixed'>
        <colgroup>
          <col className='w-12' />
          {columns.cols}
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className='sr-only'>Expand</span>
            </TableHead>
            {columns.headers}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeletonRows columns={4} />
          ) : (
            groupsOf(coils).map(group => {
              const open = expanded.has(group.key)

              return (
                <Fragment key={group.key}>
                  <TableRow className='cursor-pointer' onClick={() => toggle(group.key)}>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label={`Coils of ${group.productId ?? 'no product'}`}
                        aria-expanded={open}
                        onClick={event => {
                          event.stopPropagation()
                          toggle(group.key)
                        }}
                      >
                        <ChevronRight className={cn('transition-transform', open && 'rotate-90')} />
                      </Button>
                    </TableCell>
                    {columns.cells({
                      pid: (
                        <TableCell>
                          <span className='font-mono'>{group.productId ?? '—'}</span>
                        </TableCell>
                      ),
                      count: (
                        <TableCell>
                          <span className='font-mono'>{group.lots.length}</span>
                        </TableCell>
                      ),
                      lf: (
                        <TableCell>
                          <span className='font-mono'>
                            {figure(total(group.lots, 'linear_feet'))}
                          </span>
                        </TableCell>
                      ),
                      weight: (
                        <TableCell>
                          <span className='font-mono'>{figure(total(group.lots, 'weight'))}</span>
                        </TableCell>
                      )
                    })}
                  </TableRow>

                  {open ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className='border-l-2 border-primary/40 bg-muted/30 px-3 py-3'>
                          <div className='overflow-hidden rounded-lg border border-border bg-card'>
                            <Table className='table-fixed'>
                              <colgroup>
                                <LotColumns />
                              </colgroup>
                              <LotHead />
                              <TableBody>
                                {group.lots.map(lot => (
                                  <TableRow key={lot.id}>
                                    <LotCells lot={lot} {...handlers} />
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

type NoCoilsProps = { title: string; description: string }

const NoCoils = ({ title, description }: NoCoilsProps) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant='icon'>
        <Database />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </EmptyHeader>
  </Empty>
)

/** The filter is the Manager's; a Worker is told whose it is rather than that it is on. */
const FilterBadge = ({ worker }: { worker: boolean }) => (
  <Badge
    variant='soft'
    title={
      worker
        ? 'Thickness / Width / Grade ranges set by the Trim Manager'
        : 'Thickness / Width / Grade range filter is limiting these coils'
    }
  >
    {worker ? 'Manager’s Coil Filter' : 'Coil Filter active'}
  </Badge>
)

const noMatch = (scope: CoilScope, worker: boolean) => {
  if (scope === 'all') return 'Clear the search to see every coil.'
  return worker
    ? 'The Trim Manager’s Coil Filter is excluding every coil — clear the search, or ask him to widen the ranges.'
    : 'Widen the Coil Filter ranges, or clear the search.'
}

/** The two ways to read the list: one row per coil, or one row per size opening into its coils. */
type Layout = 'coils' | 'sizes'

const searched = (lots: CoilLot[], term: string) => {
  const search = term.trim().toLowerCase()
  return lots.filter(lot => !search || matches(lot, search)).sort(byProductThenCoil)
}

type LayoutBarProps = {
  layout: Layout
  scope: CoilScope
  canFilter: boolean
  onLayoutChange: (layout: Layout) => void
  onOpenFilter: () => void
}

const LayoutBar = ({ layout, scope, canFilter, onLayoutChange, onOpenFilter }: LayoutBarProps) => (
  <div className='flex flex-wrap items-center gap-3'>
    <Tabs value={layout} onValueChange={value => onLayoutChange(value as Layout)}>
      <TabsList>
        {/* Inside All Coils the outer tab already says «All Coils» — this one says whose. */}
        <TabsTrigger value='coils'>
          {scope === 'all' ? 'All Company Coils' : 'All Trim Coils'}
        </TabsTrigger>
        <TabsTrigger value='sizes'>All folders</TabsTrigger>
      </TabsList>
    </Tabs>

    {canFilter ? (
      <Button variant='outline' className='ml-auto' onClick={onOpenFilter}>
        <SlidersHorizontal data-icon='inline-start' />
        Coil Filter
      </Button>
    ) : null}
  </div>
)

type CountBarProps = {
  count: number
  badge: ReactNode
  term: string
  onTermChange: (term: string) => void
}

const CountBar = ({ count, badge, term, onTermChange }: CountBarProps) => (
  <div className='flex flex-wrap items-center gap-3'>
    <p className='text-sm text-muted-foreground'>
      <span className='font-medium text-foreground'>{count}</span> {count === 1 ? 'coil' : 'coils'}
    </p>

    {badge}

    <InputGroup className='ml-auto w-80'>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        type='search'
        aria-label='Search coils'
        placeholder='Search — product / coil #'
        value={term}
        onChange={event => onTermChange(event.target.value)}
      />
    </InputGroup>
  </div>
)

type Moving = { lot: CoilLot; to: Department }

const ScopeTabs = ({
  scope,
  onScopeChange
}: {
  scope: CoilScope
  onScopeChange: (scope: CoilScope) => void
}) => (
  <Tabs value={scope} onValueChange={value => onScopeChange(value as CoilScope)}>
    <TabsList className='h-10'>
      <TabsTrigger value='trim'>Trim Coils</TabsTrigger>
      <TabsTrigger
        value='all'
        title='Every coil in the company — the Coil Filter does not narrow this list'
      >
        All Coils
      </TabsTrigger>
    </TabsList>
  </Tabs>
)

type MoveConfirmProps = {
  moving: Moving | null
  isPending: boolean
  onCancel: () => void
  onConfirm: (moving: Moving) => void
}

/** Ticking one department's box on a coil the other holds moves it, which is asked first. */
const MoveConfirm = ({ moving, isPending, onCancel, onConfirm }: MoveConfirmProps) => {
  const [moved, release] = useRetained(moving)
  const to = moved ? DEPARTMENT_LABEL[moved.to] : ''
  const from = moved ? DEPARTMENT_LABEL[otherOf(moved.to)] : ''

  return (
    <ConfirmDialog
      open={!!moving}
      onOpenChange={open => !open && onCancel()}
      onOpenChangeComplete={release}
      title={`Move coil to ${to}?`}
      description={`By clicking Yes, the location for this coil will change to the ${to} department. This will uncheck the ${from} department — both locations can NOT be checked at the same time.`}
      confirmLabel='Yes'
      cancelLabel='No'
      isPending={isPending}
      onConfirm={() => moved && onConfirm(moved)}
    />
  )
}

/** Trim Coils are narrowed by the filter and wait for it; All Coils is every lot, unfiltered. */
const scopedCoils = (coils: ReturnType<typeof useTrimCoils>, trim: boolean) => ({
  lots: coils.lots ?? [],
  listed: (trim ? coils.trimLots : coils.lots) ?? [],
  filter: trim ? coils.filter : null,
  loading: coils.isPending || (trim && coils.filterLoading)
})

type CoilsTabProps = {
  departmentId: number | undefined
  /** A Worker works the coils but sees them through the Manager's filter: no scope switch, no filter. */
  worker: boolean
}

/**
 * The coils EBMS has sent. Trim Coils are the ones inside the department's Coil Filter; All Coils is
 * every coil in the company, which the filter does not narrow. A coil is checked into a department
 * and, inside Trim, into the Slinet; its figures are adjusted from here and pushed back.
 */
export const CoilsTab = ({ departmentId, worker }: CoilsTabProps) => {
  const [scope, setScope] = useState<CoilScope>('trim')
  // Coil numbers are what the tab is opened for, so the flat list is the one it lands on.
  const [layout, setLayout] = useState<Layout>('coils')
  const [term, setTerm] = useState('')
  const [adjusting, setAdjusting] = useState<{ lotId: number; focus: CoilFigure } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [moving, setMoving] = useState<Moving | null>(null)

  const scoped: CoilScope = worker ? 'trim' : scope
  const trim = scoped === 'trim'
  const { lots, listed, filter, loading } = scopedCoils(useTrimCoils(departmentId), trim)
  const setLocation = useSetCoilLocation()

  const move = (lot: CoilLot, location: Parameters<typeof setLocation.mutate>[0]['location']) =>
    setLocation.mutate({ lotId: lot.id, location }, { onSuccess: () => setMoving(null) })

  const handlers: CellHandlers = {
    onAdjust: (lot, focus) => setAdjusting({ lotId: lot.id, focus }),
    // Moving a coil between departments asks; clearing a box, or ticking one with nothing to
    // displace, does not. The question is only worth asking when an answer is being overwritten.
    onTick: (lot, department, checked) =>
      checked && lot[otherOf(department)]
        ? setMoving({ lot, to: department })
        : move(lot, { [department]: checked }),
    onSlinet: (lot, checked) => move(lot, { in_slinet: checked })
  }

  const shown = searched(listed, term)
  // Read off the list on every render, so the window never shows a coil as it stood before a save.
  const adjusted = lots.find(lot => lot.id === adjusting?.lotId) ?? null

  if (!loading && !lots.length)
    return (
      <NoCoils
        title='No coils loaded'
        description='Coils sync in from EBMS with their linear feet. None are currently in the system.'
      />
    )

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      {worker ? null : (
        <ScopeTabs
          scope={scope}
          onScopeChange={next => {
            setScope(next)
            setLayout('coils')
          }}
        />
      )}

      <p className='flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
        <Database aria-hidden className='size-4 shrink-0' />
        Coils imported from EBMS — one row per size, expand for its lots. Click a lot’s Coil
        Thickness, Linear Feet or Weight to adjust it and push back to EBMS.
      </p>

      <LayoutBar
        layout={layout}
        scope={scoped}
        canFilter={!worker && trim}
        onLayoutChange={setLayout}
        onOpenFilter={() => setFilterOpen(true)}
      />

      <CountBar
        count={shown.length}
        badge={coilFilterActive(filter) ? <FilterBadge worker={worker} /> : null}
        term={term}
        onTermChange={setTerm}
      />

      {!loading && !shown.length ? (
        <NoCoils title='No coils match' description={noMatch(scoped, worker)} />
      ) : layout === 'coils' ? (
        <CoilList coils={shown} loading={loading} {...handlers} />
      ) : (
        <SizeGrid coils={shown} loading={loading} {...handlers} />
      )}

      <CoilAdjustDialog
        lot={adjusted}
        focus={adjusting?.focus ?? 'linear_feet'}
        onOpenChange={open => !open && setAdjusting(null)}
      />

      <CoilFilterDialog
        departmentId={departmentId}
        open={filterOpen}
        onOpenChange={setFilterOpen}
      />

      <MoveConfirm
        moving={moving}
        isPending={setLocation.isPending}
        onCancel={() => setMoving(null)}
        onConfirm={({ lot, to }) => move(lot, { [to]: true, [otherOf(to)]: false })}
      />
    </div>
  )
}
