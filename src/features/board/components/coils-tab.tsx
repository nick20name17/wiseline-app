import { useColumnOrder } from '@/components/table/column-order'
import { Pager } from '@/components/table/pager'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
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
import { Fragment, useRef, useState, type ReactNode } from 'react'
import {
  coilFoldersQuery,
  coilFiltersQuery,
  coilLotsQuery,
  departmentCoilLotsQuery,
  useSetCoilProductLocation,
  useSetCoilSlinet,
  useUpdateCoilLot,
  type CoilFilter,
  type CoilLot
} from '../api'
import { useViewOnly } from '../lib/board-context'
import { COIL_GROUPS_TABLE } from '../lib/columns'
import { coilFilterActive, coilName, departmentCoilFilter, figure } from '../lib/coils'
import { CoilAdjustDialog, type CoilFigure } from './coil-adjust-dialog'
import { CoilFilterDialog } from './coil-filter-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'

// Long enough to catch a word, short enough that leaving the tab rarely beats it.
const NOTE_SAVE_MS = 600

// Gauge too: the floor names a coil by colour and gauge, «black 28».
const matches = (lot: CoilLot, term: string) =>
  `${lot.product_id ?? ''} ${lot.color ?? ''} ${lot.gauge ?? ''} ${lot.lot_number ?? ''}`
    .toLowerCase()
    .includes(term)

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

/**
 * One coil product and its lots. Colour, width and gauge are the EBMS product's, so they hold for
 * every lot under it: a coil of another colour or width is another product ID.
 */
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
    const key = lot.product_id ?? ''
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
  const viewOnly = useViewOnly()
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
      readOnly={viewOnly}
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
  onSlinet: (lot: CoilLot, checked: boolean) => void
}

const FIGURES: { key: CoilFigure; label: string }[] = [
  { key: 'coil_thickness', label: 'Coil Thickness' },
  { key: 'linear_feet', label: 'Linear Feet' },
  { key: 'weight', label: 'Weight' }
]

/**
 * A coil under its product. Trim and Rollforming are the product's and set on its row; the Slinet
 * holds one physical coil, so it is ticked here.
 */
const LotCells = ({ lot, onAdjust, onSlinet }: LotCellsProps) => {
  const slinetShut = !lot.in_slinet && !lot.slinet_available
  const viewOnly = useViewOnly()

  return (
    <>
      <TableCell>
        <span className='font-mono'>{lot.lot_number ?? '—'}</span>
      </TableCell>
      {/* The three figures are one control: clicking any of them opens the window that works the
          other two out, with the cursor in the one clicked. */}
      {FIGURES.map(({ key, label }) => (
        <TableCell key={key}>
          {viewOnly ? (
            <span className='font-mono'>{figure(lot[key])}</span>
          ) : (
            <Button
              variant='link'
              aria-label={`Adjust ${label} of coil ${coilName(lot)}`}
              title='Click to open the Coil Adjustment window'
              onClick={() => onAdjust(lot, key)}
            >
              <span className='font-mono'>{figure(lot[key])}</span>
            </Button>
          )}
        </TableCell>
      ))}
      <TableCell>
        {/* The Slinet sits inside Trim and needs a Coil Thickness before it opens. */}
        <span
          className='inline-flex'
          title={slinetShut ? 'Needs the coil in Trim and a Coil Thickness' : undefined}
        >
          <Checkbox
            aria-label={`Slinet holds coil ${coilName(lot)}`}
            checked={lot.in_slinet}
            disabled={viewOnly || slinetShut}
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

const LotHead = () => (
  <TableHeader>
    <TableRow>
      <TableHead>Coil #</TableHead>
      <TableHead>Coil Thickness</TableHead>
      <TableHead>Linear Feet</TableHead>
      <TableHead>Weight (lbs.)</TableHead>
      <TableHead>Slinet In / Out</TableHead>
      <TableHead>Note</TableHead>
    </TableRow>
  </TableHeader>
)

const LotColumns = () => (
  <>
    <col className='w-32' />
    <col className='w-28' />
    <col className='w-28' />
    <col className='w-28' />
    {/* Headed by words longer than the box under it, and the heading is what sets the width. */}
    <col className='w-32' />
    <col />
  </>
)

type CellHandlers = Omit<LotCellsProps, 'lot'>

type GroupLocationProps = {
  group: CoilGroup
  department: Department
  onTick: (group: CoilGroup, department: Department, checked: boolean) => void
}

/**
 * Where a coil product stands. The department belongs to the product ID, not to a lot: every lot of
 * it reads the same, and a lot EBMS adds later arrives already in.
 */
const GroupLocation = ({ group, department, onTick }: GroupLocationProps) => {
  const viewOnly = useViewOnly()
  const checked = group.lots.some(lot => lot[department])
  // A coil mounted in the Slinet keeps its product in Trim.
  const shut =
    department === 'in_rollforming' &&
    !checked &&
    group.lots.some(lot => !lot.rollforming_available)

  return (
    // The hint sits on a wrapper: a disabled control never shows its own.
    <span
      className='inline-flex'
      title={
        shut ? 'A coil of this product is mounted in the Slinet — take it off first' : undefined
      }
    >
      <Checkbox
        aria-label={`${DEPARTMENT_LABEL[department]} holds ${group.productId ?? 'these coils'}`}
        checked={checked}
        disabled={viewOnly || shut || !group.productId}
        onCheckedChange={next => onTick(group, department, next)}
      />
    </span>
  )
}

type ProductGridProps = CellHandlers & {
  groups: CoilGroup[]
  loading: boolean
  /** A search is on: the products it found open on their coils, which is what it was looking for. */
  searching: boolean
  onTickGroup: GroupLocationProps['onTick']
}

/** One row per coil product with its totals and location; a row opens into its coils. */
const ProductGrid = ({
  groups,
  loading,
  searching,
  onTickGroup,
  ...handlers
}: ProductGridProps) => {
  // The rows turned against how they open by default — shut, or open under a search.
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set())
  const columns = useColumnOrder(COIL_GROUPS_TABLE)

  const toggle = (key: string) => setFlipped(current => toggled(current, key))

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      <Table className='table-fixed'>
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
            <TableSkeletonRows columns={COIL_GROUPS_TABLE.columns.length + 1} />
          ) : (
            groups.map(group => {
              const open = searching !== flipped.has(group.key)

              return (
                <Fragment key={group.key}>
                  <TableRow
                    className='cursor-pointer'
                    onClick={event => {
                      // The location boxes are the row's own controls, not a way to open it.
                      if (
                        event.target instanceof Element &&
                        event.target.closest('label, button, [role=checkbox]')
                      )
                        return
                      toggle(group.key)
                    }}
                  >
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
                      ),
                      rollforming: (
                        <TableCell>
                          <GroupLocation
                            group={group}
                            department='in_rollforming'
                            onTick={onTickGroup}
                          />
                        </TableCell>
                      ),
                      trim: (
                        <TableCell>
                          <GroupLocation group={group} department='in_trim' onTick={onTickGroup} />
                        </TableCell>
                      )
                    })}
                  </TableRow>

                  {open ? (
                    <TableRow>
                      <TableCell colSpan={COIL_GROUPS_TABLE.columns.length + 1}>
                        <div className='border-l-2 border-primary/40 bg-muted/30 px-3 py-3'>
                          <div className='overflow-hidden rounded-lg border border-border bg-card'>
                            <Table className='table-fixed [&_th]:whitespace-normal'>
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

type NoCoilsProps = { title: string; description: string; action?: ReactNode }

const NoCoils = ({ title, description, action }: NoCoilsProps) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant='icon'>
        <Database />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </EmptyHeader>
    {action ? <EmptyContent>{action}</EmptyContent> : null}
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

const searched = (lots: CoilLot[], term: string) => {
  const search = term.trim().toLowerCase()
  return lots.filter(lot => !search || matches(lot, search)).sort(byColorProductCoil)
}

type Moving = { group: CoilGroup; to: Department }

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
  const what = moved?.group.productId ?? 'this product'

  return (
    <ConfirmDialog
      open={!!moving}
      onOpenChange={open => !open && onCancel()}
      onOpenChangeComplete={release}
      title={`Have you checked with the ${from} department to ensure that it is ok to move ${what} to the ${to} department?`}
      description={`Yes moves ${what} and every coil of it to ${to} and unchecks ${from} — a coil can only be in one department.`}
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
 * every coil in the company, which the filter does not narrow. A coil product is checked into a
 * department and, inside Trim, each coil into the Slinet; its figures are adjusted from here and
 * pushed back.
 */
export const CoilsTab = ({ departmentId, worker }: CoilsTabProps) => {
  const [scope, setScope] = useState<CoilScope>('trim')
  const [term, setTerm] = useState('')
  const [adjusting, setAdjusting] = useState<{ lotId: string; focus: CoilFigure } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [moving, setMoving] = useState<Moving | null>(null)
  const viewOnly = useViewOnly()
  // A folder tab narrows Trim Coils to one EBMS folder; `null` is every folder.
  const [folder, setFolder] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(40)
  const [paging, setPaging] = useState({ view: '', page: 0 })
  const listTop = useRef<HTMLDivElement>(null)

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
  const place = useSetCoilProductLocation()
  const slinet = useSetCoilSlinet()

  const move = (group: CoilGroup, location: Partial<Record<Department, boolean>>) =>
    group.productId &&
    place.mutate({ productId: group.productId, location }, { onSuccess: () => setMoving(null) })

  // Moving a product between departments asks; clearing a box, or ticking one with nothing to
  // displace, does not. The question is only worth asking when an answer is being overwritten.
  const tick = (group: CoilGroup, department: Department, checked: boolean) =>
    checked && group.lots.some(lot => lot[otherOf(department)])
      ? setMoving({ group, to: department })
      : move(group, { [department]: checked })

  const handlers: CellHandlers = {
    onAdjust: (lot, focus) => setAdjusting({ lotId: lot.id, focus }),
    onSlinet: (lot, checked) => slinet.mutate({ lotId: lot.id, inSlinet: checked })
  }

  const shown = searched(inFolder, term)
  // A page belongs to the list it was turned on: any change to what is listed starts again at one.
  const view = [scoped, folder, term, pageSize].join('|')
  const page = paging.view === view ? paging.page : 0
  // Pages through products, so a product's coils never split across two pages.
  const groups = groupsOf(shown)
  // An edit can drop coils off the last page; the page then steps back rather than show nothing.
  const current = Math.min(page, Math.max(0, Math.ceil(groups.length / pageSize) - 1))
  const from = current * pageSize
  // A folder tab left open hides the coil being searched for, and nothing on screen says so.
  const elsewhere = !!folder && !!term.trim() && !shown.length ? searched(listed, term).length : 0
  // Read off the list on every render, so the window never shows a coil as it stood before a save.
  const adjusted = listed.find(lot => lot.id === adjusting?.lotId) ?? null

  const filterDialog = (
    <CoilFilterDialog departmentId={departmentId} open={filterOpen} onOpenChange={setFilterOpen} />
  )

  const scopeTabs = worker ? null : (
    <Tabs value={scope} onValueChange={value => setScope(value as CoilScope)}>
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
    !worker && !viewOnly && trim ? (
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
      {scopeTabs || filterButton ? (
        <div className='flex flex-wrap items-center gap-3'>
          {scopeTabs}
          {filterButton}
        </div>
      ) : null}

      {/* p1 (253,624): each EBMS folder holding a qualifying coil is a tab. Brett may cut this to the
          one Coil folder (round 10, A1). */}
      {trim && folders?.length ? (
        <Tabs
          value={folder ?? 'all'}
          onValueChange={value => setFolder(value === 'all' ? null : String(value))}
        >
          {/* A department has dozens of folders; they scroll on their own line rather than widen the
              page under the sidebar. */}
          <div className='scrollport overflow-x-auto'>
            <TabsList variant='line'>
              <TabsTrigger value='all'>All folders</TabsTrigger>
              {folders.map(entry => (
                <TabsTrigger key={entry.folder_id} value={entry.folder_id}>
                  {entry.name}
                  <span
                    className='font-mono text-xs text-muted-foreground'
                    title={`${entry.products} products · ${entry.lots} coils`}
                  >
                    {entry.products}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      ) : null}

      <div className='flex flex-wrap items-center gap-3'>
        <p className='text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>{groups.length}</span>{' '}
          {groups.length === 1 ? 'product' : 'products'} ·{' '}
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
            placeholder='Search — product / colour / gauge / coil #'
            value={term}
            onChange={event => setTerm(event.target.value)}
          />
        </InputGroup>
      </div>

      {!loading && !shown.length ? (
        <NoCoils
          title='No coils match'
          description={
            elsewhere
              ? `None in this folder — ${elsewhere} in other folders.`
              : 'Clear the search to see every coil.'
          }
          action={
            elsewhere ? (
              <Button variant='outline' onClick={() => setFolder(null)}>
                Search all folders
              </Button>
            ) : null
          }
        />
      ) : (
        <div ref={listTop} className='flex scroll-mt-4 flex-col gap-4'>
          <ProductGrid
            // Starting a search, or clearing one, starts the rows over from how it opens them.
            key={term.trim() ? 'searching' : 'listing'}
            groups={groups.slice(from, from + pageSize)}
            loading={loading}
            searching={!!term.trim()}
            onTickGroup={tick}
            {...handlers}
          />
          {loading ? null : (
            <Pager
              page={current}
              pageSize={pageSize}
              total={groups.length}
              noun='products'
              onPage={next => {
                setPaging({ view, page: next })
                // The pager sits under the rows; the next page is read from its first row.
                listTop.current?.scrollIntoView({ block: 'start' })
              }}
              onPageSize={setPageSize}
            />
          )}
        </div>
      )}

      <CoilAdjustDialog
        lot={adjusted}
        focus={adjusting?.focus ?? 'linear_feet'}
        onOpenChange={open => !open && setAdjusting(null)}
      />

      {filterDialog}

      <MoveConfirm
        moving={moving}
        isPending={place.isPending}
        onCancel={() => setMoving(null)}
        onConfirm={({ group, to }) => move(group, { [to]: true })}
      />
    </div>
  )
}
