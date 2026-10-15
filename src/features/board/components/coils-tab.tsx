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
import { Fragment, useDeferredValue, useRef, useState, type ReactNode } from 'react'
import {
  coilFiltersQuery,
  coilLotsQuery,
  departmentCoilLotsQuery,
  useSetCoilLocation,
  useSetCoilProductLocation,
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
import { toast } from '@/components/ui/toast'

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

type Department = 'in_trim' | 'in_rollforming'

const DEPARTMENT_LABEL: Record<Department, string> = {
  in_trim: 'Trim',
  in_rollforming: 'Rollforming'
}

const otherOf = (department: Department): Department =>
  department === 'in_trim' ? 'in_rollforming' : 'in_trim'

/**
 * One coil product and its lots. Colour, width and gauge are the EBMS product's, so they hold for
 * every lot under it: a coil of another colour or width is another product ID. Where a lot stands is
 * its own — coils of one product sit in different departments.
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
  onLocate: (lot: CoilLot, department: Department, checked: boolean) => void
  onSlinet: (lot: CoilLot, checked: boolean) => void
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
}

/** One coil's Trim or Rollforming box. A coil in the Slinet keeps to Trim. */
const LotLocation = ({ lot, department, onTick }: LotLocationProps) => {
  const viewOnly = useViewOnly()
  const shut = department === 'in_rollforming' && !lot[department] && !lot.rollforming_available

  return (
    // The hint sits on a wrapper: a disabled control never shows its own.
    <span className='inline-flex items-center gap-2' title={shut ? IN_SLINET : undefined}>
      <Checkbox
        aria-label={`${DEPARTMENT_LABEL[department]} holds coil ${coilName(lot)}`}
        checked={lot[department]}
        disabled={viewOnly || shut}
        onCheckedChange={checked => onTick(lot, department, checked)}
      />
      {shut && !viewOnly ? <TouchHint>{IN_SLINET}</TouchHint> : null}
    </span>
  )
}

/** A coil under its product, with where it stands: Rollforming or Trim, and inside Trim the Slinet. */
const LotCells = ({ lot, onAdjust, onLocate, onSlinet }: LotCellsProps) => {
  const slinetShut = !lot.in_slinet && !lot.slinet_available
  const viewOnly = useViewOnly()

  return (
    <>
      <TableCell card='title'>
        <span className='font-mono'>{lot.lot_number ?? '—'}</span>
      </TableCell>
      {/* The three figures are one control: clicking any of them opens the window that works the
          other two out, with the cursor in the one clicked. */}
      {FIGURES.map(({ key, label }) => (
        <TableCell key={key} label={label}>
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
      <TableCell label='Rollforming'>
        <LotLocation lot={lot} department='in_rollforming' onTick={onLocate} />
      </TableCell>
      <TableCell label='Trim'>
        <LotLocation lot={lot} department='in_trim' onTick={onLocate} />
      </TableCell>
      <TableCell label='Slinet In / Out'>
        {/* The Slinet sits inside Trim and needs a Coil Thickness before it opens. */}
        <span
          className='inline-flex items-center gap-2'
          title={slinetShut ? SLINET_SHUT : undefined}
        >
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
    <col className='w-32' />
    <col className='w-28' />
    <col className='w-28' />
    <col className='w-28' />
    <col className='w-32' />
    <col className='w-20' />
    {/* Headed by words longer than the box under it, and the heading is what sets the width. */}
    <col className='w-32' />
    <col />
  </>
)

type CellHandlers = Omit<LotCellsProps, 'lot'>

const MOUNTED = 'A coil of this product is mounted in the Slinet — take it off first'

type GroupLocationProps = {
  group: CoilGroup
  department: Department
  onTick: (group: CoilGroup, department: Department, checked: boolean) => void
}

/**
 * A shortcut over the coils' own boxes: ticked when every coil of the product stands in the
 * department, and ticking it moves all of them there. A mixed product shows how many are in.
 */
const GroupLocation = ({ group, department, onTick }: GroupLocationProps) => {
  const viewOnly = useViewOnly()
  const inside = group.lots.filter(lot => lot[department]).length
  const checked = inside === group.lots.length
  // The server moves all of them or none, and a coil on the Slinet cannot go to Rollforming.
  const shut = department === 'in_rollforming' && !checked && group.lots.some(lot => lot.in_slinet)
  const label = DEPARTMENT_LABEL[department]

  return (
    <span
      className='inline-flex items-center gap-2'
      title={
        shut
          ? MOUNTED
          : `${checked ? 'Take' : 'Put'} every coil of this product ${checked ? 'out of' : 'in'} ${label}`
      }
    >
      <Checkbox
        aria-label={`Every coil of ${group.productId ?? 'this product'} in ${label}`}
        checked={checked}
        disabled={viewOnly || shut || !group.productId}
        onCheckedChange={next => onTick(group, department, next)}
      />
      {inside && !checked ? (
        <span className='font-mono text-xs text-muted-foreground'>
          {inside}/{group.lots.length}
        </span>
      ) : null}
      {shut && !viewOnly ? <TouchHint>{MOUNTED}</TouchHint> : null}
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
      <Table data-cards className='table-fixed'>
        <colgroup>
          <col className='w-12' />
          {columns.cols}
          {/* Every column has a width, so the screen's slack goes to this one, which has no cells. */}
          <col />
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
                      pid: (
                        <TableCell>
                          <span className='font-mono'>{group.productId ?? '—'}</span>
                        </TableCell>
                      ),
                      color: (
                        <TableCell>
                          <span className='truncate' title={group.color ?? undefined}>
                            {group.color ?? '—'}
                          </span>
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
                      {/* The tick column, the table's own and the slack one. */}
                      <TableCell colSpan={COIL_GROUPS_TABLE.columns.length + 2}>
                        <div className='border-l-2 border-primary/40 bg-muted/30 px-3 py-3'>
                          <div className='overflow-hidden rounded-lg border border-border bg-card'>
                            <Table data-cards className='table-fixed [&_th]:whitespace-normal'>
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

/** A move about to displace the other department: one coil, or every coil of a product at once. */
type Moving = { to: Department } & ({ lot: CoilLot } | { group: CoilGroup })

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
  const what = !moved
    ? ''
    : 'lot' in moved
      ? `coil ${coilName(moved.lot)}`
      : `every coil of ${moved.group.productId ?? 'this product'}`

  return (
    <ConfirmDialog
      open={!!moving}
      onOpenChange={open => !open && onCancel()}
      onOpenChangeComplete={release}
      title={`Have you checked with the ${from} department to ensure that it is ok to move ${what} to the ${to} department?`}
      description={`Yes moves ${what} to ${to} and unchecks ${from} — a coil can only be in one department.`}
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
 * every coil in the company, which the filter does not narrow. Each coil is checked into a
 * department and, inside Trim, into the Slinet — or a whole product at once; its figures are adjusted
 * from here and pushed back.
 */
export const CoilsTab = ({ departmentId, worker }: CoilsTabProps) => {
  const [scope, setScope] = useState<CoilScope>('trim')
  const [term, setTerm] = useState('')
  // The input keeps up with the typing; the list catches up when there is time for it.
  const deferredTerm = useDeferredValue(term)
  const [adjusting, setAdjusting] = useState<{ lotId: string; focus: CoilFigure } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [moving, setMoving] = useState<Moving | null>(null)
  const viewOnly = useViewOnly()
  const [assignment, setAssignment] = useState<Assignment>('all')
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
  const match = ASSIGNMENT_MATCH[assignment]
  const inAssignment = indexed.filter(({ lot }) => match(lot))
  const placeProduct = useSetCoilProductLocation()
  const placeLot = useSetCoilLocation()

  const moveLot = (lot: CoilLot, location: Partial<Record<Department, boolean>>) =>
    placeLot.mutate({ lotId: lot.id, location }, { onSuccess: () => setMoving(null) })

  const moveGroup = (group: CoilGroup, department: Department, checked: boolean) =>
    group.productId &&
    placeProduct.mutate(
      { productId: group.productId, location: { [department]: checked } },
      {
        onSuccess: ({ lots }) => {
          setMoving(null)
          toast.add({
            type: 'success',
            title: `${lots} ${lots === 1 ? 'coil' : 'coils'} of ${group.productId} ${checked ? 'moved to' : 'taken out of'} ${DEPARTMENT_LABEL[department]}`
          })
        }
      }
    )

  // Moving between departments asks; clearing a box, or ticking one with nothing to displace, does
  // not. The question is only worth asking when an answer is being overwritten.
  const tickGroup = (group: CoilGroup, department: Department, checked: boolean) =>
    checked && group.lots.some(lot => lot[otherOf(department)])
      ? setMoving({ group, to: department })
      : moveGroup(group, department, checked)

  const handlers: CellHandlers = {
    onAdjust: (lot, focus) => setAdjusting({ lotId: lot.id, focus }),
    onLocate: (lot, department, checked) =>
      checked && lot[otherOf(department)]
        ? setMoving({ lot, to: department })
        : moveLot(lot, { [department]: checked }),
    onSlinet: (lot, checked) => placeLot.mutate({ lotId: lot.id, location: { in_slinet: checked } })
  }

  const shown = searched(inAssignment, deferredTerm)
  // A page belongs to the list it was turned on: any change to what is listed starts again at one.
  const view = [scoped, assignment, deferredTerm, pageSize].join('|')
  const page = paging.view === view ? paging.page : 0
  // Pages through products, so a product's coils never split across two pages.
  const groups = groupsOf(shown)
  // An edit can drop coils off the last page; the page then steps back rather than show nothing.
  const current = Math.min(page, Math.max(0, Math.ceil(groups.length / pageSize) - 1))
  const from = current * pageSize
  // An assignment filter left on hides the coil being searched for, and nothing on screen says so.
  const elsewhere =
    assignment !== 'all' && !shown.length ? searched(indexed, deferredTerm).length : 0
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
      <TabsList className='h-10 max-md:w-full'>
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
        <div className='flex flex-wrap items-center gap-3'>
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

      <div className='flex flex-wrap items-center gap-3'>
        <p className='text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>{groups.length}</span>{' '}
          {groups.length === 1 ? 'product' : 'products'} ·{' '}
          <span className='font-medium text-foreground'>{shown.length}</span>{' '}
          {shown.length === 1 ? 'coil' : 'coils'}
        </p>

        {coilFilterActive(filter) ? <FilterBadge worker={worker} /> : null}

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

        <InputGroup className='w-full md:ml-auto md:w-80'>
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
              ? `None ${assignment} — ${elsewhere} ${elsewhere === 1 ? 'is' : 'are'} ${assignment === 'assigned' ? 'unassigned' : 'assigned'}.`
              : 'Clear the search to see every coil.'
          }
          action={
            elsewhere ? (
              <Button variant='outline' onClick={() => setAssignment('all')}>
                Show all coils
              </Button>
            ) : null
          }
        />
      ) : (
        <div ref={listTop} className='flex scroll-mt-4 flex-col gap-4'>
          <ProductGrid
            // Starting a search, or clearing one, starts the rows over from how it opens them.
            key={deferredTerm.trim() ? 'searching' : 'listing'}
            groups={groups.slice(from, from + pageSize)}
            loading={loading}
            searching={!!deferredTerm.trim()}
            onTickGroup={tickGroup}
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
        isPending={placeProduct.isPending || placeLot.isPending}
        onCancel={() => setMoving(null)}
        onConfirm={next =>
          'lot' in next
            ? moveLot(next.lot, { [next.to]: true })
            : moveGroup(next.group, next.to, true)
        }
      />
    </div>
  )
}
