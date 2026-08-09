import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown, Inbox, Lock, Search, TriangleAlert } from 'lucide-react'

import { viewingAsLabel } from '@/session/nav-visibility'
import { usePage } from '@/session/use-page'
import { useViewer } from '@/session/use-viewer'
import { useStore } from '@/store/create-store'

import { Sidebar } from '@/components/shell/chrome'
import { Toast } from '@/components/shell/toast'

import {
  barColor,
  filteredLocations,
  fmtN,
  isFull,
  isOver,
  occCurrent,
  occPct,
  orderCap,
  orderCount,
  setSearch,
  toggleType,
  TYPES,
  typeColor,
  warehouseStore
} from '@/features/warehouse/store'

import '@/styles/warehouse.css'

export const Route = createFileRoute('/_authenticated/warehouse')({
  component: Warehouse
})

/**
 * Every location in the yard, as a tile: how full it is by weight, how many orders it holds against
 * its cap, and whether it can take another.
 *
 * "Full" is not one thing — a location closes at its order capacity *or* over its weight limit, and a
 * single-order location is full the moment anything is in it. The badge says Available or Full; the
 * lock and the warning triangle say which of the two closed it.
 */
function Warehouse() {
  usePage('warehouse')

  const state = useStore(warehouseStore, current => current)
  const viewer = useViewer()

  const rows = filteredLocations(state)
  const occupied = rows.filter(location => orderCount(location) > 0).length
  const full = rows.filter(isFull).length
  const over = rows.filter(isOver).length
  const avg = rows.length
    ? Math.round(rows.reduce((total, location) => total + occPct(location), 0) / rows.length)
    : 0

  return (
    <>
      <div className='app' data-comment='app-shell'>
        <Sidebar
          current='/warehouse'
          role={viewer?.role ?? 'admin'}
          department={viewer?.department ?? 'all'}
          roleLabel={viewingAsLabel(viewer?.role ?? 'admin', viewer?.department ?? 'all')}
        />

        <div className='main' data-comment='main'>
          <header className='topbar' data-comment='topbar'>
            <div className='crumb' data-comment='topbar-crumb'>
              <strong data-comment='topbar-crumb-root'>Warehouse</strong>
            </div>
            <div className='topbar-right' data-comment='topbar-right'>
              <div className='avatar' data-comment='topbar-avatar' title='John Enns'>
                JE
              </div>
            </div>
          </header>

          <main className='content' data-comment='content'>
            <div className='wh-head' data-comment='wh-head'>
              <div data-comment='wh-head-text'>
                <h1 className='wh-head-title' data-comment='wh-head-title'>
                  Warehouse
                </h1>
                <p className='wh-head-sub' data-comment='wh-head-sub'>
                  Location occupancy across the yard
                </p>
              </div>
              <div className='wh-controls' data-comment='wh-controls'>
                <button className='select-btn' data-pop-anchor data-comment='wh-warehouse-select'>
                  <span id='wh-warehouse-label' data-comment='wh-warehouse-label'>
                    {state.activeWarehouse === 'All' ? 'All Buildings' : state.activeWarehouse}
                  </span>
                  <ChevronDown />
                </button>
                <div className='search' data-comment='wh-search'>
                  <Search style={{ width: '14px', height: '14px' }} />
                  <input
                    type='text'
                    placeholder='Search location #…'
                    data-comment='wh-search-input'
                    value={state.search}
                    onChange={event => setSearch(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className='legend-row' id='wh-legend' data-comment='wh-legend'>
              {TYPES.map(type => {
                const key = `legend-chip-${type.key.toLowerCase()}`

                return (
                  <button
                    className={`legend-chip${state.activeTypes.includes(type.key) ? ' active' : ''}`}
                    style={{ '--clr': type.color } as React.CSSProperties}
                    data-comment={key}
                    onClick={() => toggleType(type.key)}
                    key={type.key}
                  >
                    <span className='legend-dot' data-comment={`${key}-dot`} />
                    <span data-comment={`${key}-label`}>{type.key}</span>
                  </button>
                )
              })}
            </div>

            <div className='stat-row' id='wh-stats' data-comment='wh-stats'>
              <div className='stat-card' data-comment='stat-total'>
                <div className='stat-label' data-comment='stat-total-label'>
                  Total Locations
                </div>
                <div className='stat-value mono' data-comment='stat-total-value'>
                  {rows.length}
                </div>
              </div>
              <div className='stat-card' data-comment='stat-occupied'>
                <div className='stat-label' data-comment='stat-occupied-label'>
                  Occupied
                </div>
                <div className='stat-value mono' data-comment='stat-occupied-value'>
                  {occupied}
                </div>
              </div>
              <div className='stat-card' data-comment='stat-full'>
                <div className='stat-label' data-comment='stat-full-label'>
                  Full / Unavailable
                </div>
                <div className='stat-value mono' data-comment='stat-full-value'>
                  {full}
                </div>
              </div>
              <div className='stat-card' data-comment='stat-over'>
                <div className='stat-label' data-comment='stat-over-label'>
                  Over Weight
                </div>
                <div
                  className={`stat-value mono${over ? ' danger' : ''}`}
                  data-comment='stat-over-value'
                >
                  {over}
                </div>
              </div>
              <div className='stat-card' data-comment='stat-avg'>
                <div className='stat-label' data-comment='stat-avg-label'>
                  Avg Utilization
                </div>
                <div className='stat-value mono' data-comment='stat-avg-value'>
                  {avg}%
                </div>
              </div>
            </div>

            <div className='wh-grid' id='wh-grid' data-comment='wh-grid'>
              {!rows.length ? (
                <div
                  className='table-wrap'
                  data-comment='wh-grid-empty-wrap'
                  style={{ gridColumn: '1/-1' }}
                >
                  <div className='empty' data-comment='wh-grid-empty'>
                    <Inbox className='empty-ico' data-comment='wh-grid-empty-icon' />
                    <h3 data-comment='wh-grid-empty-title'>No locations match</h3>
                    <p data-comment='wh-grid-empty-text'>
                      Try a different warehouse, type filter, or search term.
                    </p>
                  </div>
                </div>
              ) : (
                rows.map(location => {
                  const pct = occPct(location)
                  const over = isOver(location)
                  const empty = orderCount(location) === 0
                  const closed = isFull(location)
                  const key = `wh-tile-${location.id}`

                  return (
                    <button
                      className={`wh-tile${empty ? ' is-empty' : ''}${closed ? ' is-full' : ''}${over ? ' is-over' : ''}`}
                      data-comment={key}
                      key={location.id}
                    >
                      {over ? (
                        <TriangleAlert className='wh-tile-alert' data-comment={`${key}-alert`} />
                      ) : closed ? (
                        <Lock className='wh-tile-lock' data-comment={`${key}-lock`} />
                      ) : null}
                      <div className='wh-tile-num mono' data-comment={`${key}-num`}>
                        {location.name}
                      </div>
                      <div className='wh-tile-type' data-comment={`${key}-type`}>
                        <span
                          className='wh-tile-dot'
                          style={{ background: typeColor(location.type) }}
                        />
                        {location.type}
                      </div>
                      <div className='wh-tile-bar-row' data-comment={`${key}-bar-row`}>
                        <div className='wh-tile-bar' data-comment={`${key}-bar`}>
                          <span
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: barColor(location)
                            }}
                          />
                        </div>
                        <span className='wh-tile-pct mono' data-comment={`${key}-pct`}>
                          {pct}%
                        </span>
                      </div>
                      <div className='wh-tile-amount mono' data-comment={`${key}-amount`}>
                        {fmtN(occCurrent(location))} / {fmtN(location.maxWeight)} lb
                      </div>
                      <div className='wh-tile-occ' data-comment={`${key}-occ`}>
                        {orderCount(location)} / {orderCap(location)} order
                        {orderCap(location) > 1 ? 's' : ''}
                      </div>
                      <span
                        className={`wh-tile-badge ${closed ? 'full' : 'avail'}`}
                        data-comment={`${key}-badge`}
                      >
                        {closed ? 'Full' : 'Available'}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </main>
        </div>
      </div>
      <Toast />
    </>
  )
}
