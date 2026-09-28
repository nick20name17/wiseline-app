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
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ChevronRight, Database, Search, SlidersHorizontal } from 'lucide-react'
import { Fragment, useRef, useState } from 'react'
import {
  coilFoldersQuery,
  useSetCoilLocation,
  coilFiltersQuery,
  coilLotsQuery,
  departmentCoilLotsQuery,
  useUpdateCoilLot,
  type CoilFilter,
  type CoilLot
} from '../api'
import { COIL_GROUPS_TABLE } from '../lib/columns'
import { coilFilterActive, coilName, departmentCoilFilter, figure } from '../lib/coils'
import { CoilAdjustDialog, type CoilFigure } from './coil-adjust-dialog'
import { CoilFilterDialog } from './coil-filter-dialog'
import { ConfirmDialog } from './confirm-dialog'

// Long enough to catch a word, short enough that leaving the tab rarely beats it.
const NOTE_SAVE_MS = 600

const matches = (lot: CoilLot, term: string) =>
  `${lot.product_id ?? ''} ${lot.color ?? ''} ${lot.lot_number ?? ''}`.toLowerCase().includes(term)

// The board reads by colour, then product, then coil #.
const byColorProductCoil = (a: CoilLot, b: CoilLot) =>
  (a.color ?? '').localeCompare(b.color ?? '') ||
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

/** One size of coil: the board sizes a coil by Product ID, Color and Width. */
type CoilGroup = {
  key: string
  productId: string | null
  color: string | null
  width: number | null
  lots: CoilLot[]
}

const groupsOf = (lots: CoilLot[]) => {
  const groups = new Map<string, CoilGroup>()
  for (const lot of lots) {
    const key = `${lot.product_id ?? ''}|${lot.color ?? ''}|${lot.width ?? ''}`
    const group = groups.get(key) ?? {
      key,
      productId: lot.product_id,
      color: lot.color,
      width: lot.width,
      lots: []
    }
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
const LotHead = ({ lead = [] }: { lead?: string[] }) => (
  <TableHeader>
    <TableRow>
      {lead.map(label => (
        <TableHead key={label} rowSpan={2}>
          {label}
        </TableHead>
      ))}
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
        <col className='w-36' />
        <col className='w-28' />
        <LotColumns />
      </colgroup>
      <LotHead lead={['Product ID', 'Color', 'Grade (ksi)']} />
      <TableBody>
        {loading ? (
          <TableSkeletonRows columns={10} />
        ) : (
          coils.map(lot => (
            <TableRow key={lot.id}>
              <TableCell>
                <span className='font-mono'>{lot.product_id ?? '—'}</span>
              </TableCell>
              <TableCell>
                <span className='truncate'>{lot.color ?? '—'}</span>
              </TableCell>
              <TableCell>
                <span className='font-mono'>{figure(lot.grade)}</span>
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
            <TableSkeletonRows columns={6} />
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
                      color: (
                        <TableCell>
                          <span className='truncate'>{group.color ?? '—'}</span>
                        </TableCell>
                      ),
                      width: (
                        <TableCell>
                          <span className='font-mono'>{figure(group.width)}</span>
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
                      <TableCell colSpan={7}>
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

const NO_COILS: NoCoilsProps = {
  title: 'No coils loaded',
  description: 'Coils sync in from EBMS with their linear feet. None are currently in the system.'
}

/**
 * An empty list, said the way its scope makes it empty. Trim Coils starts empty: without a Coil
 * Filter the server lets no coil in, rather than every one.
 */
const nothingListed = (trim: boolean, filter: CoilFilter | null, worker: boolean): NoCoilsProps => {
  if (!trim) return NO_COILS
  if (!filter)
    return {
      title: 'No Coil Filter yet',
      description: worker
        ? 'The Trim Manager has not set which coils belong in Trim yet.'
        : 'Trim lists only the coils a Coil Filter lets in — set one to fill this list.'
    }
  if (!coilFilterActive(filter)) return NO_COILS
  return {
    title: 'No coils pass the Coil Filter',
    description: worker
      ? 'The Trim Manager’s Coil Filter is excluding every coil — ask him to widen the ranges.'
      : 'Widen the Coil Filter ranges to let coils through to Trim.'
  }
}

/** The two ways to read the list: one row per coil, or one row per size opening into its coils. */
type Layout = 'coils' | 'sizes'

const searched = (lots: CoilLot[], term: string) => {
  const search = term.trim().toLowerCase()
  return lots.filter(lot => !search || matches(lot, search)).sort(byColorProductCoil)
}

type Moving = { lot: CoilLot; to: Department }

type MoveConfirmProps = {
  moving: Moving | null
  isPending: boolean
  onCancel: () => void
  onConfirm: (moving: Moving) => void
}

/**
 * Ticking one department's box on a coil the other holds moves it. The board asks whether the other
 * department agreed (p1 (300,689), (320,689)); Yes moves it and unticks theirs (p1 (276,702)).
 */
const MoveConfirm = ({ moving, isPending, onCancel, onConfirm }: MoveConfirmProps) => {
  const [moved, release] = useRetained(moving)
  const to = moved ? DEPARTMENT_LABEL[moved.to] : ''
  const from = moved ? DEPARTMENT_LABEL[otherOf(moved.to)] : ''

  return (
    <ConfirmDialog
      open={!!moving}
      onOpenChange={open => !open && onCancel()}
      onOpenChangeComplete={release}
      title={`Have you checked with the ${from} department to ensure that it is ok to move this coil to the ${to} department?`}
      description={`Yes moves the coil to ${to} and unchecks ${from} — a coil can only be in one department.`}
      confirmLabel='Yes'
      cancelLabel='No'
      isPending={isPending}
      onConfirm={() => moved && onConfirm(moved)}
    />
  )
}

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
  const [adjusting, setAdjusting] = useState<{ lotId: string; focus: CoilFigure } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [moving, setMoving] = useState<Moving | null>(null)
  // A folder tab narrows Trim Coils to one EBMS folder; `null` is every folder.
  const [folder, setFolder] = useState<string | null>(null)

  const scoped: CoilScope = worker ? 'trim' : scope
  const trim = scoped === 'trim'
  // Trim Coils come narrowed by the server, folder filters included; the company-wide list is only
  // fetched while All Coils is open, which a Worker never sees.
  const trimLots = useQuery({
    ...departmentCoilLotsQuery(departmentId),
    enabled: trim && departmentId !== undefined
  })
  const allLots = useQuery({ ...coilLotsQuery, enabled: !trim })
  const { data: lots, isPending: lotsPending } = trim ? trimLots : allLots
  const listed = lots ?? []
  // Read for the badge and the empty-state wording; an empty Trim list is worded by it, so nothing
  // is called empty until it is in.
  const { data: filters, isLoading: filterLoading } = useQuery({
    ...coilFiltersQuery(departmentId),
    enabled: trim && departmentId !== undefined
  })
  const filter = trim ? departmentCoilFilter(filters) : null
  const loading = lotsPending || (trim && filterLoading)
  const { data: folders } = useQuery({
    ...coilFoldersQuery(departmentId),
    enabled: trim && departmentId !== undefined
  })
  const inFolder = trim && folder ? listed.filter(lot => lot.folder_id === folder) : listed
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

  const shown = searched(inFolder, term)
  // Read off the list on every render, so the window never shows a coil as it stood before a save.
  const adjusted = listed.find(lot => lot.id === adjusting?.lotId) ?? null

  const filterDialog = (
    <CoilFilterDialog departmentId={departmentId} open={filterOpen} onOpenChange={setFilterOpen} />
  )

  const scopeTabs = worker ? null : (
    <Tabs
      value={scope}
      onValueChange={value => {
        setScope(value as CoilScope)
        setLayout('coils')
      }}
    >
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

  const filterButton =
    !worker && trim ? (
      <Button variant='outline' className='ml-auto' onClick={() => setFilterOpen(true)}>
        <SlidersHorizontal data-icon='inline-start' />
        Coil Filter
      </Button>
    ) : null

  // The filter decides which coils reach Trim, so it has to be reachable while none do — and the
  // scope switch too, or an empty Trim list would hide every other coil.
  if (!loading && !listed.length)
    return (
      <div className='flex flex-1 flex-col gap-4'>
        <div className='flex items-center gap-3'>
          {scopeTabs}
          {filterButton}
        </div>
        <NoCoils {...nothingListed(trim, filter, worker)} />
        {filterDialog}
      </div>
    )

  return (
    <div className='flex min-w-0 flex-col gap-4'>
      {scopeTabs}

      <p className='flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
        <Database aria-hidden className='size-4 shrink-0' />
        Coils imported from EBMS — one row per size, expand for its lots. Click a lot’s Coil
        Thickness, Linear Feet or Weight to adjust it and push back to EBMS.
      </p>

      <div className='flex flex-wrap items-center gap-3'>
        <Tabs value={layout} onValueChange={value => setLayout(value as Layout)}>
          <TabsList>
            {/* Inside All Coils the outer tab already says «All Coils» — this one says whose. */}
            <TabsTrigger value='coils'>{trim ? 'All Trim Coils' : 'All Company Coils'}</TabsTrigger>
            <TabsTrigger value='sizes'>By size</TabsTrigger>
          </TabsList>
        </Tabs>
        {filterButton}
      </div>

      {/* p1 (253,624): each EBMS folder holding a qualifying coil is a tab. */}
      {trim && folders?.length ? (
        <Tabs
          value={folder ?? 'all'}
          onValueChange={value => setFolder(value === 'all' ? null : String(value))}
        >
          <TabsList variant='line'>
            <TabsTrigger value='all'>All folders</TabsTrigger>
            {folders.map(entry => (
              <TabsTrigger key={entry.folder_id} value={entry.folder_id}>
                {entry.name}
                <span className='font-mono text-xs text-muted-foreground'>{entry.coils}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}

      <div className='flex flex-wrap items-center gap-3'>
        <p className='text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>{shown.length}</span>{' '}
          {shown.length === 1 ? 'coil' : 'coils'}
        </p>

        {coilFilterActive(filter) ? <FilterBadge worker={worker} /> : null}

        <InputGroup className='ml-auto w-80'>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type='search'
            aria-label='Search coils'
            placeholder='Search — product / colour / coil #'
            value={term}
            onChange={event => setTerm(event.target.value)}
          />
        </InputGroup>
      </div>

      {!loading && !shown.length ? (
        <NoCoils title='No coils match' description='Clear the search to see every coil.' />
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

      {filterDialog}

      <MoveConfirm
        moving={moving}
        isPending={setLocation.isPending}
        onCancel={() => setMoving(null)}
        onConfirm={({ lot, to }) => move(lot, { [to]: true, [otherOf(to)]: false })}
      />
    </div>
  )
}
