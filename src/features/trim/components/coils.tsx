import { ChevronRight, Database, Search, SlidersHorizontal } from 'lucide-react'

import { Fragment, useState } from 'react'

import { useStore } from '@/store/create-store'

import {
  coilFilterActive,
  coilInRange,
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

import type { Coil } from '@/store/shared/coils'

/**
 * The coil drop-down: every lot of one size that EBMS knows about, with the canvas's Location group
 * (Rollforming · Trim · Slinet In/Out) and the always-visible per-coil note (#177).
 */
const CoilLots = ({ group, index }: { group: CoilGroup; index: number }) => (
  <table className='sub coil-lots' data-comment={`coilg-subtable-${index}`}>
    <thead>
      <tr>
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
      </tr>
      <tr>
        <th style={{ width: '96px' }}>Rollforming</th>
        <th style={{ width: '70px' }}>Trim</th>
        <th style={{ width: '96px' }}>Slinet In / Out</th>
      </tr>
    </thead>
    <tbody>
      {group.coils.map(coil => (
        <tr key={coil.id} data-comment={`coil-row-${coil.id}`}>
          <td className='mono' data-comment={`coil-num-${coil.id}`}>
            {coil.coilNumber}
          </td>
          <td
            className='mono lot-adjust'
            data-comment={`coil-thickness-${coil.id}`}
            title='Click to open the Coil Adjustment window'
            onClick={() => openCoilAdjust({ coilId: coil.id, focusField: 'thickness' })}
          >
            {coil.thickness != null ? coil.thickness : <span className='subtle'>—</span>}
          </td>
          <td
            className='mono lot-adjust'
            data-comment={`coil-linearFeet-${coil.id}`}
            title='Click to open the Coil Adjustment window'
            onClick={() => openCoilAdjust({ coilId: coil.id, focusField: 'linearFeet' })}
          >
            {coil.linearFeet.toLocaleString()}
          </td>
          <td
            className='mono lot-adjust'
            data-comment={`coil-weight-${coil.id}`}
            title='Click to open the Coil Adjustment window'
            onClick={() => openCoilAdjust({ coilId: coil.id, focusField: 'weight' })}
          >
            {coil.weight.toLocaleString()}
          </td>
          <td data-comment={`coil-locrfcell-${coil.id}`}>
            <input
              type='checkbox'
              className='chk'
              data-comment={`coil-locrf-${coil.id}`}
              checked={coil.locRollforming}
              disabled={!rfEligible(coil)}
              onChange={() => requestCoilLocation(coil, 'locRollforming')}
              title={
                rfEligible(coil)
                  ? undefined
                  : 'Coil is mounted in the Slinet — take it off the Slinet first'
              }
            />
          </td>
          <td data-comment={`coil-loctrimcell-${coil.id}`}>
            <input
              type='checkbox'
              className='chk'
              data-comment={`coil-loctrim-${coil.id}`}
              checked={coil.locTrim}
              onChange={() => requestCoilLocation(coil, 'locTrim')}
            />
          </td>
          <td data-comment={`coil-slinetcell-${coil.id}`}>
            <input
              type='checkbox'
              className='chk'
              data-comment={`coil-slinet-${coil.id}`}
              checked={coil.slinetIn}
              disabled={!slinetEligible(coil)}
              onChange={() => toggleSlinet(coil.id)}
              title={
                slinetEligible(coil) ? undefined : 'Needs the coil in Trim and a Coil Thickness'
              }
            />
          </td>
          <td data-comment={`coil-notecell-${coil.id}`}>
            <input
              className='coil-note-input'
              data-comment={`coil-note-${coil.id}`}
              value={coil.note}
              placeholder='Add note…'
              onChange={event => setCoilNote(coil.id, event.target.value)}
            />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)

type CoilGroup = {
  key: string
  productId: string
  color: string
  width: number
  coils: Coil[]
}

export const Coils = () => {
  const { coils, expandedCoilGroups } = useStore(trimStore, current => current)
  const [folder, setFolder] = useState('all')
  const [query, setQuery] = useState('')

  // seeded from the department's saved filter, then held here: applying it has to redraw the folders
  const [filter, setFilter] = useState(loadCoilFilter)
  const [filterOpen, setFilterOpen] = useState(false)
  // he sees the filter and works within it, but cannot set it
  const managersFilter = trimStore.get().role === 'worker'

  if (!coils.length)
    return (
      <EmptyState
        title='No coils loaded'
        text='Coils sync in from EBMS with their linear feet. None are currently in the system.'
      />
    )

  const folders = qualifyingCoilFolders(coils, filter)
  const activeFolder = folder !== 'all' && !folders.includes(folder) ? 'all' : folder

  const needle = query.trim().toLowerCase()
  const filtered = coils.filter(
    coil =>
      coilInRange(coil, filter) &&
      (activeFolder === 'all' || coil.folder === activeFolder) &&
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
      width: coil.width,
      coils: []
    }
    group.coils.push(coil)
    groups.set(key, group)
  }
  const list = [...groups.values()].sort(
    (a, b) => a.color.localeCompare(b.color) || a.productId.localeCompare(b.productId)
  )

  const toggleGroup = (key: string) =>
    trimStore.set(state => ({
      expandedCoilGroups: state.expandedCoilGroups.includes(key)
        ? state.expandedCoilGroups.filter(open => open !== key)
        : [...state.expandedCoilGroups, key]
    }))

  return (
    <>
      <div className='preview-note' data-comment='coils-note'>
        <Database style={{ width: '14px', height: '14px' }} />
        Coils imported from EBMS — one row per size, expand for its lots. Click a lot&apos;s Coil
        Thickness, Linear Feet or Weight to adjust it and push back to EBMS. Same inventory as the
        plant-wide{' '}
        <a data-comment='coils-crosslink' href='/coils'>
          Coils
        </a>{' '}
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
        <span className='toolbar-spacer' />
        {managersFilter ? null : (
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
        {coilFilterActive(filter) ? (
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

      {list.length === 0 ? (
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
                <th style={{ width: '130px' }}>Product ID</th>
                <th>Color</th>
                <th style={{ width: '90px' }}>Width (in.)</th>
                <th style={{ width: '70px' }}>Count</th>
                <th style={{ width: '140px' }}>Total Linear Feet</th>
                <th style={{ width: '150px' }}>Total Weight (lbs.)</th>
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
                      <td className='mono' data-comment={`coilg-pid-${index}`}>
                        {group.productId}
                      </td>
                      <td data-comment={`coilg-color-${index}`}>{group.color}</td>
                      <td className='mono' data-comment={`coilg-width-${index}`}>
                        {group.width}
                      </td>
                      <td className='mono' data-comment={`coilg-count-${index}`}>
                        {group.coils.length}
                      </td>
                      <td className='mono' data-comment={`coilg-lf-${index}`}>
                        {group.coils
                          .reduce((sum, coil) => sum + coil.linearFeet, 0)
                          .toLocaleString()}
                      </td>
                      <td className='mono' data-comment={`coilg-w-${index}`}>
                        {group.coils.reduce((sum, coil) => sum + coil.weight, 0).toLocaleString()}
                      </td>
                    </tr>

                    {expanded ? (
                      <tr className='subrow' data-comment={`coilg-sub-${index}`}>
                        <td colSpan={7}>
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
