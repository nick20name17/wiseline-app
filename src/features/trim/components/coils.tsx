import { ChevronRight, Database, Search, SlidersHorizontal } from 'lucide-react'

import { Link } from '@tanstack/react-router'

import { Fragment, useState } from 'react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import {
  coilFilterActive,
  coilInRange,
  EMPTY_COIL_FILTER,
  loadCoilFilter,
  qualifyingCoilFolders,
  rfEligible,
  slinetEligible
} from '../coil-filter'
import { setCoilFilterFor } from '@/store/shared/settings'

import { CoilFilterModal } from '@/features/coils/modals'

import { DEPARTMENT, setCoilNote, toggleSlinet, trimStore } from '../store'
import { openCoilAdjust, requestCoilLocation, showToast } from '../ui'
import { EmptyState } from './bits'

import { FLAT_COIL_TAB, sortCoilsFlat, type Coil } from '@/store/shared/coils'

/** The folder-tab key of the flat per-coil list, which is a sibling of the folders, not one of them. */
const FLAT_FOLDER = FLAT_COIL_TAB

/**
 * N-166/#114: the group grid's columns move. The lot sub-table below keeps its fixed order — its head
 * is two rows deep, with «Location» spanning three of them, and a dragged column cannot cross that.
 */
const GROUP_COLUMNS: Column[] = [
  { key: 'pid', label: 'Product ID', width: '130px' },
  { key: 'color', label: 'Color' },
  { key: 'gauge', label: 'Gauge', width: '70px' },
  { key: 'width', label: 'Width (in.)', width: '90px' },
  { key: 'count', label: 'Count', width: '70px' },
  { key: 'lf', label: 'Total Linear Feet', width: '140px' },
  { key: 'weight', label: 'Total Weight (lbs.)', width: '150px' }
]

/**
 * The eight cells every lot row has, wherever it is drawn: the drop-down under a size (`CoilLots`) and
 * the flat All Coils list (#116/#118) show the same coil, so they share one row and differ only in the
 * anchor prefix their `data-comment`s carry.
 */
const LotCells = ({ coil, prefix }: { coil: Coil; prefix: string }) => (
  <>
    <td className='mono' data-comment={`${prefix}num-${coil.id}`}>
      {coil.coilNumber}
    </td>
    <td
      className='mono lot-adjust'
      data-comment={`${prefix}thickness-${coil.id}`}
      title='Click to open the Coil Adjustment window'
      onClick={() => openCoilAdjust({ coilId: coil.id, focusField: 'thickness' })}
    >
      {coil.thickness != null ? coil.thickness : <span className='subtle'>—</span>}
    </td>
    <td
      className='mono lot-adjust'
      data-comment={`${prefix}linearFeet-${coil.id}`}
      title='Click to open the Coil Adjustment window'
      onClick={() => openCoilAdjust({ coilId: coil.id, focusField: 'linearFeet' })}
    >
      {coil.linearFeet.toLocaleString()}
    </td>
    <td
      className='mono lot-adjust'
      data-comment={`${prefix}weight-${coil.id}`}
      title='Click to open the Coil Adjustment window'
      onClick={() => openCoilAdjust({ coilId: coil.id, focusField: 'weight' })}
    >
      {coil.weight.toLocaleString()}
    </td>
    <td data-comment={`${prefix}locrfcell-${coil.id}`}>
      <input
        type='checkbox'
        className='chk'
        data-comment={`${prefix}locrf-${coil.id}`}
        checked={coil.locRollforming}
        disabled={!rfEligible(coil)}
        onChange={() => requestCoilLocation(coil, 'locRollforming')}
        title={
          rfEligible(coil) ? undefined : 'Coil is mounted in the Slinet — take it off the Slinet first'
        }
      />
    </td>
    <td data-comment={`${prefix}loctrimcell-${coil.id}`}>
      <input
        type='checkbox'
        className='chk'
        data-comment={`${prefix}loctrim-${coil.id}`}
        checked={coil.locTrim}
        onChange={() => requestCoilLocation(coil, 'locTrim')}
      />
    </td>
    <td data-comment={`${prefix}slinetcell-${coil.id}`}>
      <input
        type='checkbox'
        className='chk'
        data-comment={`${prefix}slinet-${coil.id}`}
        checked={coil.slinetIn}
        disabled={!slinetEligible(coil)}
        onChange={() => toggleSlinet(coil.id)}
        title={slinetEligible(coil) ? undefined : 'Needs the coil in Trim and a Coil Thickness'}
      />
    </td>
    <td data-comment={`${prefix}notecell-${coil.id}`}>
      <input
        className='coil-note-input'
        data-comment={`${prefix}note-${coil.id}`}
        value={coil.note}
        placeholder='Add note…'
        onChange={event => setCoilNote(coil.id, event.target.value)}
      />
    </td>
  </>
)

/** The «Location»/«Slinet»/«Note» head the lot columns sit under, two rows deep in both tables. */
const LotHead = () => (
  <>
    <th rowSpan={2} style={{ width: '120px' }}>
      Coil #
    </th>
    <th rowSpan={2} style={{ width: '110px' }}>
      Coil Thickness
    </th>
    <th rowSpan={2} style={{ width: '100px' }}>
      Linear Feet
    </th>
    <th rowSpan={2} style={{ width: '110px' }}>
      Weight (lbs.)
    </th>
    <th colSpan={3} className='lot-locgroup'>
      Location
    </th>
    <th rowSpan={2}>Note</th>
  </>
)

const LotHeadRow2 = () => (
  <tr>
    <th style={{ width: '96px' }}>Rollforming</th>
    <th style={{ width: '70px' }}>Trim</th>
    <th style={{ width: '96px' }}>Slinet In / Out</th>
  </tr>
)

/**
 * The coil drop-down: every lot of one size that EBMS knows about, with the canvas's Location group
 * (Rollforming · Trim · Slinet In/Out) and the always-visible per-coil note (#177).
 */
const CoilLots = ({ group, index }: { group: CoilGroup; index: number }) => (
  <table className='sub coil-lots' data-comment={`coilg-subtable-${index}`}>
    <thead>
      <tr>
        <LotHead />
      </tr>
      <LotHeadRow2 />
    </thead>
    <tbody>
      {group.coils.map(coil => (
        <tr key={coil.id} data-comment={`coil-row-${coil.id}`}>
          <LotCells coil={coil} prefix='coil-' />
        </tr>
      ))}
    </tbody>
  </table>
)

/**
 * #116: one row per individual coil rather than per size — the list a Manager reads when he wants coil
 * numbers, not totals. Same rows as the drop-downs, with the size the row belongs to spelled out in
 * front of them, and no grouping to expand.
 */
const AllCoilsFlat = ({ coils }: { coils: Coil[] }) => (
  <div className='table-wrap' data-comment='coils-flat-wrap'>
    <table className='coils-grid grid coil-lots' data-comment='coils-flat-table'>
      <thead>
        <tr>
          <th rowSpan={2} style={{ width: '130px' }}>
            Product ID
          </th>
          <th rowSpan={2}>Color</th>
          <th rowSpan={2} style={{ width: '70px' }}>
            Gauge
          </th>
          <th rowSpan={2} style={{ width: '90px' }}>
            Width (in.)
          </th>
          <LotHead />
        </tr>
        <LotHeadRow2 />
      </thead>
      <tbody data-comment='coils-flat-tbody'>
        {coils.map(coil => (
          <tr key={coil.id} data-comment={`flatcoil-row-${coil.id}`}>
            <td className='mono' data-comment={`flatcoil-pid-${coil.id}`}>
              {coil.productId}
            </td>
            <td data-comment={`flatcoil-color-${coil.id}`}>{coil.color}</td>
            <td className='mono' data-comment={`flatcoil-gauge-${coil.id}`}>
              {coil.gauge != null ? coil.gauge : <span className='subtle'>—</span>}
            </td>
            <td className='mono' data-comment={`flatcoil-width-${coil.id}`}>
              {coil.width}
            </td>
            <LotCells coil={coil} prefix='flatcoil-' />
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

type CoilGroup = {
  key: string
  productId: string
  color: string
  /** #115: a Product ID carries its gauge, so every lot of one size reports the same one. */
  gauge: number | null
  width: number
  coils: Coil[]
}

/** #117: the two coil lists a Manager has. `all` ignores the department's Coil Filter entirely. */
type Scope = 'trim' | 'all'

export const Coils = () => {
  const { coils, expandedCoilGroups, role } = useStore(trimStore, current => current)
  /**
   * The Coils tab always opens on Trim Coils (#117), which it gets for free: `trim.tsx` mounts one view
   * at a time, so leaving the tab unmounts this and the next visit starts here again.
   */
  const [scope, setScope] = useState<Scope>('trim')
  const [folder, setFolder] = useState('all')
  const [query, setQuery] = useState('')

  // seeded from the department's saved filter, then held here: applying it has to redraw the folders
  const [filter, setFilter] = useState(loadCoilFilter)
  const [filterOpen, setFilterOpen] = useState(false)
  const { headers, cells } = useColumnOrder('trim-coils', GROUP_COLUMNS, { notify: showToast })
  /**
   * He sees the filter and works within it, but cannot set it.
   *
   * Read through `useStore` and not `trimStore.get()`: a `get()` in render subscribes to nothing, so the
   * button stayed on screen for a Worker — and the React Compiler, seeing no reactive input, is free to
   * compute it once and never again.
   */
  const managersFilter = role === 'worker'
  /** He only ever has the one list, so the scope tabs are not drawn for him at all. */
  const scoped: Scope = managersFilter ? 'trim' : scope
  /** «All Coils» is every coil in the company — the Manager's own filter does not narrow it. */
  const activeFilter = scoped === 'all' ? EMPTY_COIL_FILTER : filter

  if (!coils.length)
    return (
      <EmptyState
        title='No coils loaded'
        text='Coils sync in from EBMS with their linear feet. None are currently in the system.'
      />
    )

  const folders = qualifyingCoilFolders(coils, activeFilter)
  const activeFolder =
    folder !== 'all' && folder !== FLAT_FOLDER && !folders.includes(folder) ? 'all' : folder
  const flat = activeFolder === FLAT_FOLDER

  const needle = query.trim().toLowerCase()
  const filtered = coils.filter(
    coil =>
      coilInRange(coil, activeFilter) &&
      (activeFolder === 'all' || flat || coil.folder === activeFolder) &&
      (!needle ||
        `${coil.productId} ${coil.color} ${coil.coilNumber}`.toLowerCase().includes(needle))
  )

  // one row per coil size (Product ID × Color × Width); the lots live in the drop-down
  const groups = new Map<string, CoilGroup>()
  for (const coil of filtered) {
    const key = `${coil.productId}|${coil.color}|${coil.width}`
    const group = groups.get(key) ?? {
      key,
      productId: coil.productId,
      color: coil.color,
      gauge: coil.gauge,
      width: coil.width,
      coils: []
    }
    group.coils.push(coil)
    groups.set(key, group)
  }
  const list = [...groups.values()].sort(
    (a, b) => a.color.localeCompare(b.color) || a.productId.localeCompare(b.productId)
  )

  const flatList = sortCoilsFlat(filtered)

  const toggleGroup = (key: string) =>
    trimStore.set(state => ({
      expandedCoilGroups: state.expandedCoilGroups.includes(key)
        ? state.expandedCoilGroups.filter(open => open !== key)
        : [...state.expandedCoilGroups, key]
    }))

  return (
    <>
      {managersFilter ? null : (
        <div className='machine-tabs coils-scope-tabs' data-comment='coils-scopes'>
          <button
            className={`mtab ${scoped === 'trim' ? 'active' : ''}`}
            data-comment='coils-scope-trim'
            onClick={() => {
              setScope('trim')
              setFolder('all')
            }}
          >
            Trim Coils
          </button>
          <button
            className={`mtab ${scoped === 'all' ? 'active' : ''}`}
            data-comment='coils-scope-all'
            title='Every coil in the company — the Coil Filter does not narrow this list'
            onClick={() => {
              setScope('all')
              setFolder('all')
            }}
          >
            All Coils
          </button>
        </div>
      )}

      <div className='preview-note' data-comment='coils-note'>
        <Database style={{ width: '14px', height: '14px' }} />
        Coils imported from EBMS — one row per size, expand for its lots. Click a lot&apos;s Coil
        Thickness, Linear Feet or Weight to adjust it and push back to EBMS. Same inventory as the
        plant-wide{' '}
        <Link data-comment='coils-crosslink' to='/coils'>
          Coils
        </Link>{' '}
        page.
      </div>

      <div className='machine-tabs coils-folder-tabs' data-comment='coils-folders'>
        <button
          className={`mtab ${activeFolder === 'all' ? 'active' : ''}`}
          data-comment='coils-folder-all'
          onClick={() => setFolder('all')}
        >
          All folders
        </button>
        {folders.map(name => (
          <button
            key={name}
            className={`mtab ${activeFolder === name ? 'active' : ''}`}
            data-comment={`coils-folder-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            onClick={() => setFolder(name)}
          >
            {name}
          </button>
        ))}
        <button
          className={`mtab ${flat ? 'active' : ''}`}
          data-comment='coils-folder-flat'
          onClick={() => setFolder(FLAT_FOLDER)}
        >
          {/* inside the All Coils scope the outer tab already says «All Coils» — this one says whose */}
          {scoped === 'all' ? 'All Company Coils' : 'All Trim Coils'}
        </button>
        <span className='toolbar-spacer' />
        {managersFilter || scoped === 'all' ? null : (
          <button
            className='btn btn-primary btn-sm'
            data-comment='coils-filter-btn'
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal style={{ width: '14px', height: '14px' }} />
            Coil Filter
          </button>
        )}
      </div>

      <div className='toolbar' data-comment='coils-toolbar'>
        <span className='toolbar-info' data-comment='coils-count'>
          <b>{filtered.length}</b> coil{filtered.length !== 1 ? 's' : ''}
        </span>
        {coilFilterActive(activeFilter) ? (
          <span
            className='split-badge'
            data-comment='coils-rangebadge'
            title={
              managersFilter
                ? 'Thickness / Width / Grade ranges set by the Trim Manager'
                : 'Thickness / Width / Grade range filter is limiting these folders'
            }
          >
            {managersFilter ? "Manager's Coil Filter" : 'Coil Filter active'}
          </span>
        ) : null}
        <div className='toolbar-spacer' />
        <div className='search' data-comment='coils-search-wrap' style={{ maxWidth: '320px' }}>
          <Search style={{ width: '14px', height: '14px' }} />
          <input
            type='text'
            data-comment='coils-search'
            placeholder='Search — product / colour / coil #'
            aria-label='Search coils'
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </div>
      </div>

      {flat && filtered.length ? (
        <AllCoilsFlat coils={flatList} />
      ) : list.length === 0 ? (
        <EmptyState
          title='No coils match'
          text={
            managersFilter
              ? "The Trim Manager's Coil Filter is excluding every coil — clear the search, or ask him to widen the ranges."
              : 'Widen the Coil Filter ranges, or clear the search.'
          }
        />
      ) : (
        <div className='table-wrap' data-comment='coils-wrap'>
          <table className='coils-grid grid' data-comment='coils-table'>
            <thead>
              <tr>
                <th style={{ width: '30px' }} />
                {headers}
              </tr>
            </thead>
            <tbody data-comment='coils-tbody'>
              {list.map((group, index) => {
                const expanded = expandedCoilGroups.includes(group.key)

                return (
                  <Fragment key={group.key}>
                    <tr
                      className='row-order'
                      data-comment={`coilg-row-${index}`}
                      style={{ cursor: 'pointer' }}
                      onClick={event => {
                        if ((event.target as HTMLElement).closest('button,input,a')) return
                        toggleGroup(group.key)
                      }}
                    >
                      <td>
                        <button
                          aria-label='Toggle details'
                          className={`expander ${expanded ? 'open' : ''}`}
                          data-comment={`coilg-exp-${index}`}
                          onClick={() => toggleGroup(group.key)}
                        >
                          <ChevronRight style={{ width: '14px', height: '14px' }} />
                        </button>
                      </td>
                      {cells({
                        pid: (
                          <td data-col='pid' className='mono' data-comment={`coilg-pid-${index}`}>
                            {group.productId}
                          </td>
                        ),
                        color: (
                          <td data-col='color' data-comment={`coilg-color-${index}`}>
                            {group.color}
                          </td>
                        ),
                        gauge: (
                          <td
                            data-col='gauge'
                            className='mono'
                            data-comment={`coilg-gauge-${index}`}
                          >
                            {group.gauge != null ? group.gauge : <span className='subtle'>—</span>}
                          </td>
                        ),
                        width: (
                          <td
                            data-col='width'
                            className='mono'
                            data-comment={`coilg-width-${index}`}
                          >
                            {group.width}
                          </td>
                        ),
                        count: (
                          <td
                            data-col='count'
                            className='mono'
                            data-comment={`coilg-count-${index}`}
                          >
                            {group.coils.length}
                          </td>
                        ),
                        lf: (
                          <td data-col='lf' className='mono' data-comment={`coilg-lf-${index}`}>
                            {group.coils
                              .reduce((sum, coil) => sum + coil.linearFeet, 0)
                              .toLocaleString()}
                          </td>
                        ),
                        weight: (
                          <td data-col='weight' className='mono' data-comment={`coilg-w-${index}`}>
                            {group.coils
                              .reduce((sum, coil) => sum + coil.weight, 0)
                              .toLocaleString()}
                          </td>
                        )
                      })}
                    </tr>

                    {expanded ? (
                      <tr className='subrow' data-comment={`coilg-sub-${index}`}>
                        <td colSpan={GROUP_COLUMNS.length + 1}>
                          <div className='subwrap' data-comment={`coilg-subwrap-${index}`}>
                            <CoilLots group={group} index={index} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CoilFilterModal
        open={filterOpen}
        filter={filter}
        onClose={() => setFilterOpen(false)}
        onApply={next => {
          setFilter(next)
          // #209: the filter outlives the session — the Worker inherits whatever the Manager set
          setCoilFilterFor(DEPARTMENT, next)
          setFolder('all')
          setFilterOpen(false)
          showToast(
            coilFilterActive(next)
              ? 'Coil filter applied'
              : 'Coil filter cleared — showing all folders'
          )
        }}
      />
    </>
  )
}
