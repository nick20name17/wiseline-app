import { createFileRoute } from '@tanstack/react-router'
import { Fragment } from 'react'
import { ChevronRight, Filter, Inbox, Search, SlidersHorizontal } from 'lucide-react'

import type { Coil } from '@/store/shared/coils'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar } from '@/components/shell/chrome'
import { Toast } from '@/components/shell/toast'

import {
  buildGroups,
  coilFilterActive,
  coilsStore,
  FILTER_CHIPS,
  filteredCoils,
  folderSlug,
  LOW_STOCK_LF,
  moveCoilLocation,
  moveNeedsConfirm,
  qualifyingFolders,
  rfEligible,
  setActiveFolder,
  setCoilNote,
  setFilter,
  setSearch,
  slinetEligible,
  toggleGroup,
  toggleSlinet,
  usageQty,
  type DeptFlag
} from '@/features/coils/store'

import '@/styles/coils.css'

export const Route = createFileRoute('/_authenticated/coils')({
  component: Coils
})

const num = (value: number) => value.toLocaleString()

/**
 * The coil inventory as EBMS hands it over: folders across the top, one row per colour/product group,
 * and the individual coils underneath.
 *
 * Two rules run through every row and are worth keeping in view. Slinet needs a coil that is checked
 * into Trim *and* has a Coil Thickness, so a coil EBMS has only just pushed in cannot be mounted. And
 * a location is exclusive — checking Rollforming unchecks Trim — which is why moving a coil that is
 * currently somewhere else asks first.
 */
function Coils() {
  usePage('coils')

  const state = useStore(coilsStore, current => current)
  const viewer = useViewer()

  const folders = qualifyingFolders(state)
  // the prototype resets the folder in its render; deriving it does the same without a write
  const activeFolder =
    state.activeFolder !== 'all' && !folders.includes(state.activeFolder)
      ? 'all'
      : state.activeFolder

  const tabs = [{ key: 'all', label: 'All folders' }, ...folders.map(f => ({ key: f, label: f }))]

  const coils = filteredCoils({ ...state, activeFolder })
  const groups = buildGroups(coils)

  const totalLF = coils.reduce((total, coil) => total + coil.linearFeet, 0)
  const totalWeight = coils.reduce((total, coil) => total + coil.weight, 0)
  const lowStock = coils.filter(coil => coil.linearFeet < LOW_STOCK_LF).length

  // a move that displaces the other department is confirmed first, and that modal is not ported yet
  const move = (coil: Coil, flag: DeptFlag) => {
    if (!moveNeedsConfirm(coil, flag)) moveCoilLocation(coil.id, flag)
  }

  return (
    <>
      <div className='app' data-comment='app-shell'>
        <Sidebar
          current='/coils'
          role={viewer?.role ?? 'admin'}
          department={viewer?.department ?? 'all'}
          roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
        />

        <div className='main' data-comment='main'>
          <header className='topbar' data-comment='topbar'>
            <div className='crumb' data-comment='topbar-crumb'>
              <strong data-comment='topbar-crumb-root'>Coils</strong>
            </div>
            <div className='topbar-right' data-comment='topbar-right'>
              <div className='avatar' data-comment='topbar-avatar' title='John Enns'>
                JE
              </div>
            </div>
          </header>

          <div className='dept-bar' data-comment='coils-header-bar'>
            <div className='dept-title-row' data-comment='coils-header-row'>
              <div data-comment='coils-header-titlegroup'>
                <h1 className='dept-title' data-comment='coils-title'>
                  Coils
                </h1>
                <p className='header-subtitle' data-comment='coils-subtitle'>
                  Imported from EBMS · shared across Trim &amp; Rollforming
                </p>
              </div>
              <div className='toolbar-spacer' data-comment='coils-header-spacer' />
              <div className='header-actions' data-comment='coils-header-actions'>
                <div className='search-wrap' data-comment='coils-search-wrap'>
                  <Search />
                  <input
                    className='input search-input'
                    id='coils-search'
                    data-comment='coils-search-input'
                    aria-label='Search coils'
                    placeholder='Search coils…'
                    value={state.search}
                    onChange={event => setSearch(event.target.value)}
                  />
                </div>
                <button className='btn' id='coils-filter-btn' data-comment='coils-filter-btn'>
                  <SlidersHorizontal style={{ width: '14px', height: '14px' }} />
                  Coil Filter
                </button>
              </div>
            </div>
            <div className='filter-chips' id='filter-chips' data-comment='coils-filter-chips'>
              {FILTER_CHIPS.map(chip => (
                <button
                  className={`filter-chip ${state.filter === chip.key ? 'active' : ''}`}
                  data-comment={`filter-chip-${chip.key.toLowerCase()}`}
                  onClick={() => setFilter(chip.key)}
                  key={chip.key}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <main className='content' data-comment='content'>
            <div className='subtabs' id='folder-tabs' data-comment='coils-folder-tabs'>
              {tabs.map(tab => (
                <button
                  className={`subtab ${activeFolder === tab.key ? 'active' : ''}`}
                  data-comment={`folder-tab-${folderSlug(tab.key)}`}
                  onClick={() => setActiveFolder(tab.key)}
                  key={tab.key}
                >
                  {tab.label}
                </button>
              ))}
              {coilFilterActive(state.folderFilter) ? (
                <span className='chip blue range-badge' data-comment='folder-tabs-rangebadge'>
                  <Filter style={{ width: '14px', height: '14px' }} />
                  Coil Filter active
                </span>
              ) : null}
            </div>

            <div className='stats-row' id='stats-row' data-comment='coils-stats-row'>
              <div className='stat-card' data-comment='stat-total-coils'>
                <div className='stat-label' data-comment='stat-total-coils-label'>
                  Total coils
                </div>
                <div className='stat-value mono' data-comment='stat-total-coils-value'>
                  {coils.length}
                </div>
              </div>
              <div className='stat-card' data-comment='stat-total-lf'>
                <div className='stat-label' data-comment='stat-total-lf-label'>
                  Total linear feet
                </div>
                <div className='stat-value mono' data-comment='stat-total-lf-value'>
                  {num(totalLF)}
                </div>
              </div>
              <div className='stat-card' data-comment='stat-total-weight'>
                <div className='stat-label' data-comment='stat-total-weight-label'>
                  Total weight (lb)
                </div>
                <div className='stat-value mono' data-comment='stat-total-weight-value'>
                  {num(totalWeight)}
                </div>
              </div>
              <div className='stat-card' data-comment='stat-lowstock'>
                <div className='stat-label' data-comment='stat-lowstock-label'>
                  Low-stock count
                </div>
                <div className='stat-value mono amber' data-comment='stat-lowstock-value'>
                  {lowStock}
                </div>
              </div>
            </div>

            <div id='coils-table-container' data-comment='coils-table-container'>
              {!groups.length ? (
                <div className='table-wrap' data-comment='coils-empty-wrap'>
                  <div className='empty' data-comment='coils-empty'>
                    <Inbox className='empty-ico' data-comment='coils-empty-icon' />
                    <h3 data-comment='coils-empty-title'>No coils match</h3>
                    <p data-comment='coils-empty-text'>
                      Try a different filter or clear your search.
                    </p>
                  </div>
                </div>
              ) : (
                <div className='table-wrap' data-comment='coils-table-wrap'>
                  <table className='grid' data-comment='coils-table' data-component='table'>
                    <thead>
                      <tr>
                        <th style={{ width: '34px' }} />
                        <th style={{ width: '190px' }}>Color</th>
                        <th style={{ width: '130px' }}>Product ID</th>
                        <th style={{ width: '70px' }}>Gauge</th>
                        <th style={{ width: '80px' }}>Width</th>
                        <th style={{ width: '70px' }}>Coils</th>
                        <th style={{ width: '110px' }}>Total LF</th>
                        <th style={{ width: '120px' }}>Total weight</th>
                        <th style={{ width: '110px' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody data-comment='coils-tbody'>
                      {groups.map((group, index) => {
                        const expanded = state.expandedGroups.includes(group.key)
                        const groupLF = group.coils.reduce((sum, coil) => sum + coil.linearFeet, 0)
                        const groupWeight = group.coils.reduce((sum, coil) => sum + coil.weight, 0)

                        return (
                          <Fragment key={group.key}>
                            <tr
                              className='row-order'
                              data-comment={`coilg-row-${index}`}
                              onClick={() => toggleGroup(group.key)}
                            >
                              <td data-comment={`coilg-expcell-${index}`}>
                                <button
                                  className={`expander ${expanded ? 'open' : ''}`}
                                  data-comment={`coilg-exp-${index}`}
                                >
                                  <ChevronRight style={{ width: '14px', height: '14px' }} />
                                </button>
                              </td>
                              <td data-comment={`coilg-color-${index}`}>{group.color}</td>
                              <td className='mono-cell' data-comment={`coilg-pid-${index}`}>
                                {group.productId}
                              </td>
                              <td data-comment={`coilg-gauge-${index}`}>{group.gauge}ga</td>
                              <td className='mono-cell' data-comment={`coilg-width-${index}`}>
                                {group.width}"
                              </td>
                              <td className='mono-cell' data-comment={`coilg-count-${index}`}>
                                {group.coils.length}
                              </td>
                              <td className='mono-cell' data-comment={`coilg-lf-${index}`}>
                                {num(groupLF)}
                              </td>
                              <td className='mono-cell' data-comment={`coilg-weight-${index}`}>
                                {num(groupWeight)} lb
                              </td>
                              <td data-comment={`coilg-totalcell-${index}`}>
                                <button
                                  className='total-link'
                                  data-comment={`coilg-total-${index}`}
                                  onClick={event => event.stopPropagation()}
                                >
                                  {usageQty(group.productId)} pcs
                                </button>
                              </td>
                            </tr>

                            {expanded ? (
                              <tr className='subrow' data-comment={`coilg-sub-${index}`}>
                                <td colSpan={9}>
                                  <div className='subwrap' data-comment={`coilg-subwrap-${index}`}>
                                    <table
                                      className='sub'
                                      data-comment={`coilg-subtable-${index}`}
                                      data-component='table'
                                    >
                                      <thead>
                                        <tr>
                                          <th style={{ width: '110px' }}>Coil #</th>
                                          <th style={{ width: '110px' }}>Supplier</th>
                                          <th style={{ width: '60px' }}>Grade</th>
                                          <th style={{ width: '80px' }}>Thickness</th>
                                          <th style={{ width: '90px' }}>Lin. Ft</th>
                                          <th style={{ width: '90px' }}>Weight</th>
                                          <th style={{ width: '80px' }}>Slinet</th>
                                          <th style={{ width: '130px' }}>Location</th>
                                          <th style={{ width: '150px' }}>Note</th>
                                          <th style={{ width: '150px' }} />
                                        </tr>
                                      </thead>
                                      <tbody data-comment={`coilg-subtbody-${index}`}>
                                        {group.coils.map(coil => (
                                          <CoilRow
                                            coil={coil}
                                            onMove={move}
                                            key={coil.id}
                                          />
                                        ))}
                                      </tbody>
                                    </table>
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
            </div>
          </main>
        </div>
      </div>
      <Toast />
    </>
  )
}

const CoilRow = ({
  coil,
  onMove
}: {
  coil: Coil
  onMove: (coil: Coil, flag: DeptFlag) => void
}) => {
  const low = coil.linearFeet < LOW_STOCK_LF
  const slinetOk = slinetEligible(coil)
  const rfOk = rfEligible(coil)

  return (
    <tr data-comment={`coil-row-${coil.id}`}>
      <td className='mono-cell' data-comment={`coil-num-${coil.id}`}>
        {coil.coilNumber}
      </td>
      <td data-comment={`coil-supplier-${coil.id}`}>{coil.supplier}</td>
      <td data-comment={`coil-grade-${coil.id}`}>{coil.grade}</td>
      <td className='mono-cell' data-comment={`coil-thick-${coil.id}`}>
        {coil.thickness != null ? `${coil.thickness}"` : <span className='subtle'>—</span>}
      </td>
      <td className='mono-cell' data-comment={`coil-lf-${coil.id}`}>
        {num(coil.linearFeet)}
        {low ? (
          <>
            {' '}
            <span className='chip amber' data-comment={`coil-lowtag-${coil.id}`}>
              Low
            </span>
          </>
        ) : null}
      </td>
      <td className='mono-cell' data-comment={`coil-weight-${coil.id}`}>
        {num(coil.weight)}
      </td>
      <td data-comment={`coil-slinetcell-${coil.id}`}>
        <button
          className={`slinet-tag ${coil.slinetIn ? 'slinet-in' : 'slinet-out'}`}
          data-comment={`coil-slinet-${coil.id}`}
          title={slinetOk ? undefined : 'Requires Trim location + Coil Thickness'}
          disabled={!slinetOk}
          onClick={() => toggleSlinet(coil.id)}
        >
          {coil.slinetIn ? 'In' : 'Out'}
        </button>
      </td>
      <td data-comment={`coil-loccell-${coil.id}`}>
        <div className='loc-flags' data-comment={`coil-locflags-${coil.id}`}>
          <button
            className={`loc-flag ${coil.locTrim ? 'on' : ''}`}
            data-comment={`coil-loctrim-${coil.id}`}
            onClick={() => onMove(coil, 'locTrim')}
          >
            Trim
          </button>
          <button
            className={`loc-flag ${coil.locRollforming ? 'on' : ''}`}
            data-comment={`coil-locrf-${coil.id}`}
            disabled={!rfOk}
            title={rfOk ? undefined : 'Coil is mounted in the Slinet — take it off Slinet first'}
            onClick={() => onMove(coil, 'locRollforming')}
          >
            RF
          </button>
        </div>
      </td>
      <td data-comment={`coil-notecell-${coil.id}`}>
        <input
          className='coil-note-input'
          data-comment={`coil-note-${coil.id}`}
          value={coil.note}
          placeholder='—'
          onChange={event => setCoilNote(coil.id, event.target.value)}
        />
      </td>
      <td data-comment={`coil-actionscell-${coil.id}`}>
        <div className='coil-row-actions'>
          <button className='btn btn-sm' data-comment={`coil-adjust-${coil.id}`}>
            Adjust
          </button>
          <button
            className='btn btn-sm btn-ghost'
            data-comment={`coil-deplete-${coil.id}`}
          >
            Deplete
          </button>
        </div>
      </td>
    </tr>
  )
}
