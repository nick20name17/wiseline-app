import { StickyTop } from './sticky-top'
import { useColumnOrder } from '@/components/table/column-order'
import { Pager } from '@/components/table/pager'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { QrLabels } from '@/components/qr-labels'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
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
import { ChevronRight, Database, Printer, SlidersHorizontal } from 'lucide-react'
import { Fragment, useRef, useState, type ReactNode } from 'react'
import {
  coilFiltersQuery,
  coilFoldersQuery,
  coilLotsQuery,
  departmentCoilLotsQuery,
  useSetCoilLocation,
  useUpdateCoilLot,
  type CoilFilter,
  type CoilLot
} from '../api'
import { useViewOnly } from '../lib/board-context'
import { COIL_GROUPS_TABLE } from '../lib/columns'
import { coilFilterActive, coilName, departmentCoilFilter, figure } from '../lib/coils'
import { productFacts } from '../lib/format'
import { CoilAdjustDialog, type CoilFigure } from './coil-adjust-dialog'
import { CoilFilterDialog } from './coil-filter-dialog'
import { CoilLocationDialog, type CoilPlacing } from './coil-location-dialog'
import { CoilScanDialog } from './coil-scan-dialog'
import { EbmsSyncMark } from './ebms-sync'
import { ConfirmDialog } from '@/components/confirm-dialog'

// Long enough to catch a word, short enough that leaving the tab rarely beats it.
const NOTE_SAVE_MS = 600

// The board reads by colour, then product, then coil #.
const byColorProductCoil = (a: CoilLot, b: CoilLot) =>
  (a.color ?? '').localeCompare(b.color ?? '') ||
  (a.product_id ?? '').localeCompare(b.product_id ?? '') ||
  (a.lot_number ?? '').localeCompare(b.lot_number ?? '')

/** A lot with the text a search is matched against. */
type IndexedLot = { lot: CoilLot; text: string }

/**
 * Sorted and lowercased once per list rather than on every keystroke: a search only filters, which
 * keeps the order. Gauge is in the text too — the floor names a coil by colour and gauge, «black 28».
 */
const indexLots = (lots: CoilLot[]): IndexedLot[] =>
  lots.toSorted(byColorProductCoil).map(lot => ({
    lot,
    text: `${lot.product_id ?? ''} ${lot.color ?? ''} ${lot.gauge ?? ''} ${lot.lot_number ?? ''}`.toLowerCase()
  }))

/** The two lists the board keeps: the coils standing in this department, and the plant's whole stock. */
type CoilScope = 'trim' | 'all'

/** Whether a coil is in a department yet: a coil new from EBMS is in none until someone ticks one. */
type Assignment = 'all' | 'assigned' | 'unassigned'

const assigned = (lot: CoilLot) => lot.in_trim || lot.in_rollforming

const ASSIGNMENT_MATCH: Record<Assignment, (lot: CoilLot) => boolean> = {
  all: () => true,
  assigned,
  unassigned: lot => !assigned(lot)
}

const ASSIGNMENT_LABEL: Record<Assignment, string> = {
  all: 'All',
  assigned: 'Assigned',
  unassigned: 'Unassigned'
}

type Department = 'in_trim' | 'in_rollforming'

const DEPARTMENT_LABEL: Record<Department, string> = {
  in_trim: 'Trim',
  in_rollforming: 'Rollforming'
}

const otherOf = (department: Department): Department =>
  department === 'in_trim' ? 'in_rollforming' : 'in_trim'

const DEPARTMENT_CODE: Record<Department, CoilPlacing['department']> = {
  in_trim: 'trim',
  in_rollforming: 'rollforming'
}

/**
 * One coil product and its lots. Colour, width and gauge are the EBMS product's, so they hold for
 * every lot under it: a coil of another colour or width is another product ID. Where a lot stands is
 * its own — coils of one product sit in different departments.
 */
type CoilGroup = {
  key: string
  productId: string | null
  color: string | null
  gauge: number | null
  width: number | null
  folderId: string | null
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
      gauge: lot.gauge,
      width: lot.width,
      folderId: lot.folder_id,
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
  onLocate: (lot: CoilLot, department: Department, checked: boolean) => void
  onSlinet: (lot: CoilLot, checked: boolean) => void
  /** Another location in the department the coil stands in. */
  onPlace: (lot: CoilLot, department: Department) => void
  onPrint: (lot: CoilLot) => void
}

const SLINET_SHUT = 'Needs the coil in Trim and a Coil Thickness'
const IN_SLINET = 'Mounted in the Slinet — take it off first'

/** Why a box is shut, in words where a finger cannot hover for the title that says it. */
const TouchHint = ({ children }: { children: ReactNode }) => (
  <span className='text-xs text-muted-foreground pointer-fine:hidden'>{children}</span>
)

const FIGURES: { key: CoilFigure; label: string }[] = [
  { key: 'coil_thickness', label: 'Coil Thickness' },
  { key: 'linear_feet', label: 'Linear Feet' },
  { key: 'weight', label: 'Weight' }
]

type LotLocationProps = {
  lot: CoilLot
  department: Department
  onTick: LotCellsProps['onLocate']
  onPlace: LotCellsProps['onPlace']
}

/**
 * One coil's Trim or Rollforming box, and beside it the location the coil stands on there, which a
 * click changes. A coil in the Slinet keeps to Trim, on no location.
 */
const LotLocation = ({ lot, department, onTick, onPlace }: LotLocationProps) => {
  const viewOnly = useViewOnly()
  const shut = department === 'in_rollforming' && !lot[department] && !lot.rollforming_available
  const placed = lot[department] && !lot.in_slinet
  const location = lot.location ?? 'No location'

  return (
    // The hint sits on a wrapper: a disabled control never shows its own.
    <span className='flex items-center gap-2' title={shut ? IN_SLINET : undefined}>
      <Checkbox
        aria-label={`${DEPARTMENT_LABEL[department]} holds coil ${coilName(lot)}`}
        checked={lot[department]}
        disabled={viewOnly || shut}
        onCheckedChange={checked => onTick(lot, department, checked)}
      />
      {placed ? (
        viewOnly ? (
          <span className='font-mono'>{location}</span>
        ) : (
          <Button
            variant='link'
            aria-label={`Location of coil ${coilName(lot)}: ${location}`}
            title='Click to move the coil to another location'
            onClick={() => onPlace(lot, department)}
          >
            <span className='font-mono'>{location}</span>
          </Button>
        )
      ) : null}
      {shut && !viewOnly ? <TouchHint>{IN_SLINET}</TouchHint> : null}
    </span>
  )
}

const LotCells = ({ lot, onAdjust, onLocate, onSlinet, onPlace, onPrint }: LotCellsProps) => {
  const slinetShut = !lot.in_slinet && !lot.slinet_available
  // A coil in Trim with no Coil Thickness is one the Slinet will not take: said in red where the
  // figure is missing, not only in the Slinet box's hover.
  const thicknessMissing = lot.in_trim && !lot.coil_thickness
  const viewOnly = useViewOnly()

  return (
    <>
      <TableCell card='title'>
        {/* The EBMS mark drops under the number when the column has no room for it beside. */}
        <span className='flex flex-wrap items-center gap-x-1'>
          <span className='font-mono'>{lot.lot_number ?? '—'}</span>
          {lot.lot_number ? (
            <Button
              variant='ghost'
              size='icon-xs'
              aria-label={`Print the label of coil ${coilName(lot)}`}
              title='Print the label the forklift scans'
              onClick={() => onPrint(lot)}
            >
              <Printer />
            </Button>
          ) : null}
          <EbmsSyncMark
            sync={lot.ebms_sync}
            error={lot.ebms_error}
            resend={{
              target: { lotAutoid: lot.lot_autoid },
              what: `the last change of coil ${coilName(lot)}`
            }}
          />
        </span>
      </TableCell>
      {/* The three figures are one control: clicking any of them opens the window that works the
          other two out, with the cursor in the one clicked. */}
      {FIGURES.map(({ key, label }) => {
        const missing = key === 'coil_thickness' && thicknessMissing
        const shown = (
          <span className={cn('font-mono', missing && 'text-destructive')}>
            {missing ? 'Missing' : figure(lot[key])}
          </span>
        )
        return (
          <TableCell key={key} label={label}>
            {viewOnly ? (
              shown
            ) : (
              <Button
                variant='link'
                aria-label={`Adjust ${label} of coil ${coilName(lot)}`}
                title={
                  missing
                    ? 'Add a Coil Thickness to put this coil in the Slinet'
                    : 'Click to open the Coil Adjustment window'
                }
                onClick={() => onAdjust(lot, key)}
              >
                {shown}
              </Button>
            )}
          </TableCell>
        )
      })}
      <TableCell label='Rollforming'>
        <LotLocation lot={lot} department='in_rollforming' onTick={onLocate} onPlace={onPlace} />
      </TableCell>
      <TableCell label='Trim'>
        <LotLocation lot={lot} department='in_trim' onTick={onLocate} onPlace={onPlace} />
      </TableCell>
      <TableCell label='Slinet In / Out'>
        {/* The Slinet sits inside Trim and needs a Coil Thickness before it opens. */}
        <span className='flex items-center gap-2' title={slinetShut ? SLINET_SHUT : undefined}>
          <Checkbox
            aria-label={`Slinet holds coil ${coilName(lot)}`}
            checked={lot.in_slinet}
            disabled={viewOnly || slinetShut}
            onCheckedChange={checked => onSlinet(lot, checked)}
          />
          {slinetShut && !viewOnly ? <TouchHint>{SLINET_SHUT}</TouchHint> : null}
        </span>
      </TableCell>
      <TableCell label='Note' card='full'>
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
      <TableHead>Rollforming</TableHead>
      <TableHead>Trim</TableHead>
      <TableHead>Slinet In / Out</TableHead>
      <TableHead>Note</TableHead>
    </TableRow>
  </TableHeader>
)

const LotColumns = () => (
  <>
    {/* A lot number runs to 16 characters (01-02-1484403-05). The rest are as wide as their heading
        on one line: the headings, not the figures, are the longest. */}
    <col className='w-40' />
    <col className='w-36' />
    <col className='w-32' />
    <col className='w-36' />
    <col className='w-36' />
    <col className='w-36' />
    <col className='w-36' />
    <col />
  </>
)

type CellHandlers = Omit<LotCellsProps, 'lot'>

/** How many of the product's coils stand in the department; each coil is placed on its own row. */
const GroupCount = ({ group, department }: { group: CoilGroup; department: Department }) => {
  const inside = group.lots.filter(lot => lot[department]).length
  return (
    <span
      className={cn('font-mono text-xs', !inside && 'text-muted-foreground')}
      aria-label={`${inside} of ${group.lots.length} coils in ${DEPARTMENT_LABEL[department]}`}
    >
      {inside}/{group.lots.length}
    </span>
  )
}

type ProductGridProps = CellHandlers & {
  groups: CoilGroup[]
  loading: boolean
  /** A search is on: the products it found open on their coils, which is what it was looking for. */
  searching: boolean
  /** Names the EBMS folder on each row while the rows of every folder are listed together. */
  folderName?: (folderId: string | null) => string | undefined
}

/** One row per coil product with its totals and location; a row opens into its coils. */
const ProductGrid = ({ groups, loading, searching, folderName, ...handlers }: ProductGridProps) => {
  // The rows turned against how they open by default — shut, or open under a search — kept only for
  // the search state they were turned in. Without a search that is one row at a time, as everywhere:
  // opening another folds the last.
  const [turned, setTurned] = useState({ searching, keys: new Set<string>() })
  const flipped = turned.searching === searching ? turned.keys : new Set<string>()
  const columns = useColumnOrder(COIL_GROUPS_TABLE)

  const toggle = (key: string) =>
    setTurned({
      searching,
      keys: searching ? toggled(flipped, key) : new Set(flipped.has(key) ? [] : [key])
    })

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card shadow-xs'>
      {/* The other columns' widths plus the longest Product ID (24 characters), which the table
          scrolls sideways rather than cut — and wide enough that an opened product's coils, 928px
          of fixed columns inside its 44px frame, keep a Note box worth typing in. */}
      <Table data-cards className='min-w-280 table-fixed'>
        <colgroup>
          {/* The cell's padding, its column rule and the 28px expand button, which the cell would clip. */}
          <col className='w-16' />
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
            <TableSkeletonRows />
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
                    <TableCell card='trail'>
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
                      // With no Product ID column, the gauge and the folder tell apart products of one
                      // colour: EBMS leaves many coils without a width, and the folder name carries
                      // it («21-1/4" Wide 26 Ga. SS Coils»).
                      color: (
                        <TableCell>
                          <span className='truncate' title={productFacts(group) || undefined}>
                            {productFacts(group) || '—'}
                          </span>
                          {folderName?.(group.folderId) ? (
                            <span className='block truncate text-xs text-muted-foreground'>
                              {folderName(group.folderId)}
                            </span>
                          ) : null}
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
                          <GroupCount group={group} department='in_rollforming' />
                        </TableCell>
                      ),
                      trim: (
                        <TableCell>
                          <GroupCount group={group} department='in_trim' />
                        </TableCell>
                      )
                    })}
                  </TableRow>

                  {open ? (
                    <TableRow>
                      {/* The expand column and the table's own. */}
                      <TableCell colSpan={COIL_GROUPS_TABLE.columns.length + 1}>
                        <div className='border-l-2 border-primary/40 bg-muted/30 px-3 py-3'>
                          <div className='overflow-hidden rounded-lg border border-border bg-card'>
                            <Table data-cards className='table-fixed'>
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

const searched = (lots: IndexedLot[], term: string) => {
  const search = term.trim().toLowerCase()
  return lots.flatMap(({ lot, text }) => (!search || text.includes(search) ? [lot] : []))
}

/** A move about to displace the other department. */
type Moving = { to: Department; lot: CoilLot }

type MoveConfirmProps = {
  moving: Moving | null
  onCancel: () => void
  onConfirm: (moving: Moving) => void
}

/**
 * Ticking one department's box on a coil the other holds moves it. The board asks whether the other
 * department agreed (p1 (300,689), (320,689)); Yes goes on to a location in the new department, and
 * the move unticks theirs (p1 (276,702)).
 */
const MoveConfirm = ({ moving, onCancel, onConfirm }: MoveConfirmProps) => {
  const [moved, release] = useRetained(moving)
  const to = moved ? DEPARTMENT_LABEL[moved.to] : ''
  const from = moved ? DEPARTMENT_LABEL[otherOf(moved.to)] : ''
  const what = moved ? `coil ${coilName(moved.lot)}` : ''

  return (
    <ConfirmDialog
      open={!!moving}
      onOpenChange={open => !open && onCancel()}
      onOpenChangeComplete={release}
      title={`Have you checked with the ${from} department to ensure that it is ok to move ${what} to the ${to} department?`}
      description={`Yes asks where in ${to} it goes, then moves ${what} there and unchecks ${from} — a coil can only be in one department.`}
      confirmLabel='Yes'
      cancelLabel='No'
      onConfirm={() => moved && onConfirm(moved)}
    />
  )
}

type CoilsTabProps = {
  /** The header's search, matched against product, colour, gauge and coil #. */
  search: string | undefined
  departmentId: number | undefined
  /** A Worker works the coils but sees them through the Manager's filter: no scope switch, no filter. */
  worker: boolean
}

/**
 * The coils EBMS has sent. Trim Coils are the ones inside the department's Coil Filter; All Coils is
 * every coil in the company, which the filter does not narrow. Each coil is checked into a
 * department and, inside Trim, into the Slinet; its figures are adjusted
 * from here and pushed back.
 */
export const CoilsTab = ({ search, departmentId, worker }: CoilsTabProps) => {
  const [scope, setScope] = useState<CoilScope>('trim')
  const term = search ?? ''
  const [adjusting, setAdjusting] = useState<{ lotId: string; focus: CoilFigure } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [moving, setMoving] = useState<Moving | null>(null)
  const viewOnly = useViewOnly()
  const [labelled, setLabelled] = useState<CoilLot | null>(null)
  const [assignment, setAssignment] = useState<Assignment>('all')
  // A folder tab narrows Trim Coils to one EBMS folder; `null` is every folder.
  const [folder, setFolder] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(40)
  const [paging, setPaging] = useState({ view: '', page: 0 })
  const listTop = useRef<HTMLDivElement>(null)

  const scoped: CoilScope = worker ? 'trim' : scope
  const trim = scoped === 'trim'
  // Trim Coils come narrowed by the server; the company-wide list is only
  // fetched while All Coils is open, which a Worker never sees.
  const trimLots = useQuery({
    ...departmentCoilLotsQuery(departmentId),
    enabled: trim && departmentId !== undefined
  })
  const allLots = useQuery({ ...coilLotsQuery, enabled: !trim })
  const { data: lots, isPending: lotsPending } = trim ? trimLots : allLots
  const listed = lots ?? []
  const indexed = indexLots(listed)
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
  // A folder the Coil Filter has since emptied is no longer a tab, so the list falls back to every folder.
  const openFolder = (trim && folders?.find(entry => entry.folder_id === folder)?.folder_id) || null
  const match = ASSIGNMENT_MATCH[assignment]
  const narrowed = indexed.filter(
    ({ lot }) => match(lot) && (!openFolder || lot.folder_id === openFolder)
  )
  const placeLot = useSetCoilLocation()
  // A coil stands in Trim or Rollforming only on one of its locations, so a tick into either, or out
  // of the Slinet back onto Trim's floor, waits on a pick (Kevin's notes of 2026-11-02, N12).
  const [placing, setPlacing] = useState<CoilPlacing | null>(null)

  const place = ({ lot, department }: CoilPlacing, locationId: number) => {
    const into: Department = department === 'trim' ? 'in_trim' : 'in_rollforming'
    placeLot.mutate({
      lotId: lot.id,
      location: {
        location_id: locationId,
        ...(lot[into] ? {} : { [into]: true }),
        ...(lot.in_slinet ? { in_slinet: false } : {})
      }
    })
  }

  const handlers: CellHandlers = {
    onAdjust: (lot, focus) => setAdjusting({ lotId: lot.id, focus }),
    onLocate: (lot, department, checked) =>
      !checked
        ? placeLot.mutate({ lotId: lot.id, location: { [department]: false } })
        : lot[otherOf(department)]
          ? setMoving({ lot, to: department })
          : setPlacing({ lot, department: DEPARTMENT_CODE[department] }),
    // Into the Slinet the coil leaves its location; out of it, it goes onto one of Trim's.
    onSlinet: (lot, checked) =>
      checked
        ? placeLot.mutate({ lotId: lot.id, location: { in_slinet: true } })
        : setPlacing({ lot, department: 'trim' }),
    onPlace: (lot, department) => setPlacing({ lot, department: DEPARTMENT_CODE[department] }),
    onPrint: setLabelled
  }

  const shown = searched(narrowed, term)
  // A page belongs to the list it was turned on: any change to what is listed starts again at one.
  const view = [scoped, assignment, openFolder, term, pageSize].join('|')
  const page = paging.view === view ? paging.page : 0
  // Pages through products, so a product's coils never split across two pages.
  const groups = groupsOf(shown)
  // An edit can drop coils off the last page; the page then steps back rather than show nothing.
  const current = Math.min(page, Math.max(0, Math.ceil(groups.length / pageSize) - 1))
  const from = current * pageSize
  // A folder tab or an assignment filter left on hides the coil being searched for, and nothing on
  // screen says so.
  const elsewhere =
    (openFolder || assignment !== 'all') && !shown.length ? searched(indexed, term).length : 0
  const hiddenBy = [
    openFolder && 'this folder',
    assignment !== 'all' && ASSIGNMENT_LABEL[assignment]
  ]
    .filter(Boolean)
    .join(' and ')
  // Rows of every folder are told apart by their folder, which a folder tab already names.
  const folderName =
    trim && !openFolder
      ? (id: string | null) => folders?.find(entry => entry.folder_id === id)?.name
      : undefined
  // Read off the list on every render, so the window never shows a coil as it stood before a save.
  const adjusted = listed.find(lot => lot.id === adjusting?.lotId) ?? null

  const filterDialog = (
    <CoilFilterDialog departmentId={departmentId} open={filterOpen} onOpenChange={setFilterOpen} />
  )

  const scopeTabs = worker ? null : (
    // A phone gives the switch what the filter button leaves of the row, so the two meet.
    <Tabs
      className='max-md:min-w-0 max-md:flex-1'
      value={scope}
      onValueChange={value => setScope(value as CoilScope)}
    >
      <TabsList className='max-md:w-full'>
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
      // Last on a desk, after the counts; beside the scope switch on a phone, where the rest wraps.
      <Button
        variant='outline'
        className='max-md:ml-auto md:order-2'
        onClick={() => setFilterOpen(true)}
      >
        <SlidersHorizontal data-icon='inline-start' />
        Coil Filter
      </Button>
    ) : null

  // The filter decides which coils reach Trim, so it has to be reachable while none do — and the
  // scope switch too, or an empty Trim list would hide every other coil.
  if (!loading && !listed.length)
    return (
      <div className='flex flex-1 flex-col gap-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          {scopeTabs}
          {filterButton}
        </div>
        <NoCoils {...nothingListed(trim, filter, worker)} />
        {filterDialog}
      </div>
    )

  return (
    <div className='flex min-w-0 flex-col gap-3'>
      <StickyTop className='flex-row flex-wrap items-center'>
        {scopeTabs}
        {filterButton}
        {viewOnly ? null : <CoilScanDialog />}

        {/* A row of its own on a phone, under the scope switch; one row with it on a desk. */}
        <div className='flex flex-wrap items-center gap-x-2 gap-y-3 max-md:w-full md:contents'>
          <Tabs value={assignment} onValueChange={value => setAssignment(value as Assignment)}>
            <TabsList>
              <TabsTrigger value='all'>All</TabsTrigger>
              <TabsTrigger value='assigned' title='In Trim or Rollforming'>
                Assigned
              </TabsTrigger>
              <TabsTrigger value='unassigned' title='In no department yet'>
                Unassigned
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {coilFilterActive(filter) ? <FilterBadge worker={worker} /> : null}

          <p className='text-sm text-muted-foreground md:order-1 md:ml-auto'>
            <span className='font-medium text-foreground'>{groups.length}</span>{' '}
            {groups.length === 1 ? 'product' : 'products'} ·{' '}
            <span className='font-medium text-foreground'>{shown.length}</span>{' '}
            {shown.length === 1 ? 'coil' : 'coils'}
          </p>
        </div>

        {/* p1 (253,624), (300,589): each EBMS folder holding a qualifying coil is a tab. The folder,
            not the Product ID, is what tells apart two coils of one colour and gauge (Kevin's notes
            of 2026-11-02, A8). The line is there while they load, so the list does not drop under it. */}
        {trim && (!folders || folders.length) ? (
          <Tabs
            className='w-full min-w-0 md:order-3'
            value={openFolder ?? 'all'}
            onValueChange={value => setFolder(value === 'all' ? null : String(value))}
          >
            {/* A department has dozens of folders; they scroll on their own line rather than widen
                the page under the sidebar. */}
            <div className='scrollport overflow-x-auto max-md:scrollbar-none'>
              <TabsList variant='line'>
                <TabsTrigger value='all'>All folders</TabsTrigger>
                {folders?.map(entry => (
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
      </StickyTop>

      {!loading && !shown.length ? (
        <NoCoils
          title='No coils match'
          description={
            elsewhere
              ? `${elsewhere} ${elsewhere === 1 ? 'coil matches' : 'coils match'} outside ${hiddenBy}.`
              : 'Clear the search to see every coil.'
          }
          action={
            elsewhere ? (
              <Button
                variant='outline'
                onClick={() => {
                  setAssignment('all')
                  setFolder(null)
                }}
              >
                Show all coils
              </Button>
            ) : null
          }
        />
      ) : (
        <div ref={listTop} className='flex scroll-mt-4 flex-col gap-3'>
          <ProductGrid
            // Starting a search, or clearing one, starts the rows over from how it opens them.
            key={term.trim() ? 'searching' : 'listing'}
            groups={groups.slice(from, from + pageSize)}
            loading={loading}
            searching={!!term.trim()}
            folderName={folderName}
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

      {/* The coil # is what the forklift scans before the rack it sets the coil on. */}
      {labelled?.lot_number ? (
        <QrLabels
          labels={[
            {
              key: labelled.id,
              code: labelled.lot_number,
              title: `Coil # ${labelled.lot_number}`,
              detail: [
                labelled.product_id,
                labelled.color,
                labelled.gauge && `${labelled.gauge} ga`
              ]
                .filter(Boolean)
                .join(' · ')
            }
          ]}
          onDone={() => setLabelled(null)}
        />
      ) : null}

      <MoveConfirm
        moving={moving}
        onCancel={() => setMoving(null)}
        onConfirm={next => {
          setMoving(null)
          setPlacing({ lot: next.lot, department: DEPARTMENT_CODE[next.to] })
        }}
      />

      <CoilLocationDialog
        placing={placing}
        onOpenChange={open => !open && setPlacing(null)}
        onPick={place}
      />
    </div>
  )
}
