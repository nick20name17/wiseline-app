import { Fragment } from 'react'
import { ArrowRight, CalendarClock, ChevronRight, Package, PackagePlus, Search } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate } from '../format'
import {
  loadById,
  loadLabel,
  loadWeight,
  nextLoadLabel,
  orderOverdue,
  schedGridOrders,
  sumWeight,
  truckById
} from '../selectors'
import {
  addToLoad,
  setLoadFilter,
  setSchSearch,
  shippingStore,
  toggleSchedRowExpand,
  toggleSchedSel,
  toggleSelectAllScheduled
} from '../store'
import { openSchedule, showToast } from '../ui'
import {
  EmptyState,
  ExpandRow,
  MapButton,
  NotePreviewRow,
  NotesButton,
  OrderStatusPill,
  PriorityCell,
  ShipViaCell
} from './bits'

/** Which truck, and which day of it. `all` is the read-only roll-up of every scheduled day. */
export type TruckCtx = { truckId: number; date: string }

const COLUMNS = 13

/**
 * One truck's scheduled orders: pick some, and they become a Load.
 *
 * `All Scheduled Orders` is deliberately read-only. A Load belongs to a day — it is a truck leaving
 * once — so there is no day to give one built out of a week's worth of rows, and the toolbar says so
 * rather than offering a button that could not mean anything.
 */
const TruckGrid = ({ truckId, activeDay }: { truckId: number; activeDay: string }) => {
  const state = useStore(shippingStore, current => current)
  const truck = truckById(truckId, state.trucks)
  const orders = schedGridOrders(truckId, activeDay, state)
  const readOnly = activeDay === 'all'

  const selectableIds = orders.filter(order => !order.loadId).map(order => order.id)
  const selCount = state.selScheduled.filter(id => selectableIds.includes(id)).length
  const allSelected =
    selectableIds.length > 0 && selectableIds.every(id => state.selScheduled.includes(id))
  const selectedWeight = sumWeight(
    state.orders.filter(order => state.selScheduled.includes(order.id))
  )
  const filteredLoad = state.loadFilter ? loadById(state.loadFilter, state.loads) : null

  const reschedule = () => {
    const orderIds = state.selScheduled.filter(id =>
      orders.some(order => order.id === id && !order.loadId)
    )
    if (orderIds.length) openSchedule({ orderIds })
  }

  const add = () => {
    const count = addToLoad(truckId, activeDay)
    if (count) showToast(`Added ${count} order(s) to a new Load`)
  }

  return (
    <div
      className='sch-expandwrap'
      data-comment={`sch-expandwrap-${truckId}`}
      style={{ padding: '0 14px 14px' }}
    >
      {filteredLoad ? (
        <div
          className='toolbar'
          data-comment={`sch-loadfilterbar-${truckId}`}
          style={{ marginBottom: '10px' }}
        >
          <span className='toolbar-info' data-comment={`sch-loadfilterinfo-${truckId}`}>
            Showing <b>{loadLabel(filteredLoad, state.loads)}</b> only
          </span>
          <div className='toolbar-spacer' />
          <button
            className='btn btn-sm'
            data-comment={`sch-loadfilterclear-${truckId}`}
            onClick={() => setLoadFilter(filteredLoad.id, truckId)}
          >
            Clear filter
          </button>
          <button className='btn btn-primary btn-sm' data-comment={`sch-openload-${truckId}`}>
            <ArrowRight style={{ width: '14px', height: '14px' }} />
            Open Load · Route &amp; Release
          </button>
        </div>
      ) : null}

      {readOnly ? (
        <div
          className='toolbar-info subtle'
          data-comment={`sch-readonlynote-${truckId}`}
          style={{ marginBottom: '10px', fontSize: '11.5px' }}
        >
          Select a specific day (not &quot;All Scheduled Orders&quot;) to add orders to a Load.
        </div>
      ) : (
        <div className='toolbar' data-comment={`sch-gridtoolbar-${truckId}`}>
          <div
            className='search'
            data-comment={`sch-search-${truckId}`}
            style={{ maxWidth: '220px' }}
          >
            <Search style={{ width: '14px', height: '14px' }} />
            <input
              type='text'
              placeholder='Scheduled Orders…'
              data-comment={`sch-search-input-${truckId}`}
              value={state.schSearch || ''}
              onChange={event => setSchSearch(event.target.value)}
            />
          </div>
          <span className='toolbar-info' data-comment={`sch-selinfo-${truckId}`}>
            {selCount ? (
              <>
                <b>{selCount}</b> selected · <b>{selectedWeight.toLocaleString('en-US')}</b> lb
              </>
            ) : (
              <>
                <b>{orders.length}</b> order{orders.length !== 1 ? 's' : ''}
              </>
            )}
          </span>
          <div className='toolbar-spacer' />
          <button
            className='btn btn-ghost btn-sm'
            data-comment={`sch-newpackage-${truckId}`}
            disabled={!selCount}
            title='New package'
          >
            <PackagePlus style={{ width: '14px', height: '14px' }} />
          </button>
          <button
            className='btn btn-ghost btn-sm'
            data-comment={`sch-reschedule-${truckId}`}
            disabled={!selCount}
            onClick={reschedule}
          >
            <CalendarClock style={{ width: '14px', height: '14px' }} />
            Reschedule{selCount ? ` (${selCount})` : ''}
          </button>
          <button
            className='btn btn-primary btn-sm'
            data-comment={`sch-addtoload-${truckId}`}
            disabled={!selCount}
            onClick={add}
          >
            <Package style={{ width: '14px', height: '14px' }} />
            Add To Load{selCount ? ` (${selCount})` : ''}
          </button>
        </div>
      )}

      {!orders.length ? (
        <EmptyState
          title='No orders match'
          text='Adjust the search or clear the Load filter.'
          commentKey={`schgrid-${truckId}-${activeDay}`}
        />
      ) : (
        <div className='table-wrap' data-comment={`sch-gridwrap-${truckId}-${activeDay}`}>
          <div className='table-scroll'>
            <table className='grid' data-comment={`sch-grid-${truckId}-${activeDay}`}>
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>
                    {readOnly ? null : (
                      <input
                        type='checkbox'
                        className='chk'
                        data-comment={`sch-selectall-${truckId}-${activeDay}`}
                        checked={allSelected}
                        disabled={!selectableIds.length}
                        onChange={() => toggleSelectAllScheduled(truckId, activeDay)}
                        title='Select all not yet assigned to a Load'
                      />
                    )}
                  </th>
                  <th style={{ width: '22px' }} />
                  <th style={{ width: '132px' }}>Order #</th>
                  <th style={{ width: '150px' }}>Customer</th>
                  <th style={{ width: '150px' }}>Address</th>
                  <th style={{ width: '90px' }}>City</th>
                  <th style={{ width: '36px' }}>Map</th>
                  <th style={{ width: '70px' }}>Weight</th>
                  <th style={{ width: '70px' }}>Length</th>
                  <th style={{ width: '110px' }}>Ship Via</th>
                  <th style={{ width: '118px' }}>Priority</th>
                  <th style={{ width: '104px' }}>Status</th>
                  <th style={{ width: '44px' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const selected = state.selScheduled.includes(order.id)
                  const expanded = state.expScheduledRows.includes(order.id)
                  const load = order.loadId ? loadById(order.loadId, state.loads) : null

                  return (
                    <Fragment key={order.id}>
                      <tr
                        className={`row-order ${selected ? 'selected' : ''}${orderOverdue(order) ? ' overdue' : ''}`}
                        data-comment={`sch-row-${order.id}`}
                        onClick={event => {
                          if (
                            (event.target as HTMLElement).closest(
                              'button,input,select,textarea,a,label,[data-pop-anchor],.chk'
                            )
                          )
                            return
                          toggleSchedRowExpand(order.id)
                        }}
                      >
                        {load ? (
                          <td data-comment={`sch-loadnum-${order.id}`}>
                            <span className='load-num-pill'>{loadLabel(load, state.loads)}</span>
                          </td>
                        ) : readOnly ? (
                          <td />
                        ) : (
                          <td>
                            <input
                              type='checkbox'
                              className='chk'
                              data-comment={`sch-chk-${order.id}`}
                              checked={selected}
                              onChange={() => toggleSchedSel(order.id)}
                            />
                          </td>
                        )}
                        <td>
                          <button
                            aria-label='Toggle details'
                            className={`expander ${expanded ? 'open' : ''}`}
                            data-comment={`sch-exp-${order.id}`}
                            onClick={() => toggleSchedRowExpand(order.id)}
                          >
                            <ChevronRight style={{ width: '14px', height: '14px' }} />
                          </button>
                        </td>
                        <td className='cell-order' data-comment={`sch-order-${order.id}`}>
                          {order.order}
                          {order.pickup ? (
                            <span className='pickup-badge' data-comment={`sch-pickup-${order.id}`}>
                              Pickup
                            </span>
                          ) : null}
                        </td>
                        <td className='cell-cust trunc' data-comment={`sch-cust-${order.id}`}>
                          {order.customer}
                        </td>
                        <td className='trunc' data-comment={`sch-addr-${order.id}`}>
                          {order.address}
                        </td>
                        <td className='trunc' data-comment={`sch-city-${order.id}`}>
                          {order.city}
                        </td>
                        <td data-comment={`sch-map-${order.id}`}>
                          <MapButton order={order} />
                        </td>
                        <td className='cell-num' data-comment={`sch-weight-${order.id}`}>
                          {order.weight.toLocaleString('en-US')} lb
                        </td>
                        <td
                          className={`cell-num${truck && order.longestLength > truck.maxLength ? ' over-txt' : ''}`}
                          data-comment={`sch-length-${order.id}`}
                        >
                          {order.longestLength}"
                        </td>
                        <td data-comment={`sch-shipvia-${order.id}`}>
                          <ShipViaCell order={order} />
                        </td>
                        <td data-comment={`sch-pri-${order.id}`}>
                          <PriorityCell order={order} />
                        </td>
                        <td data-comment={`sch-status-${order.id}`}>
                          <OrderStatusPill order={order} />
                        </td>
                        <td data-comment={`sch-notes-${order.id}`}>
                          <NotesButton order={order} />
                        </td>
                      </tr>

                      {expanded ? (
                        <ExpandRow order={order} ctx='sch' colSpan={COLUMNS} />
                      ) : state.notesExpanded ? (
                        <NotePreviewRow order={order} ctx='sch' colSpan={COLUMNS} />
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/** The near-fullscreen truck detail: its unreleased Loads as filter pills, then the grid. */
export const SchedTruckModal = ({
  ctx,
  onClose
}: {
  ctx: TruckCtx | null
  onClose: () => void
}) => {
  const orders = useStore(shippingStore, state => state.orders)
  const loads = useStore(shippingStore, state => state.loads)
  const trucks = useStore(shippingStore, state => state.trucks)
  const loadFilter = useStore(shippingStore, state => state.loadFilter)

  const truck = ctx ? truckById(ctx.truckId, trucks) : null
  const truckOrders = ctx
    ? orders.filter(
        order =>
          order.truckId === ctx.truckId && (ctx.date === 'all' || order.shipDate === ctx.date)
      )
    : []
  const loadsHere = ctx
    ? loads.filter(
        load =>
          load.truckId === ctx.truckId &&
          load.status === 'unreleased' &&
          (ctx.date === 'all' || load.date === ctx.date) &&
          truckOrders.some(order => order.loadId === load.id)
      )
    : []

  return (
    <Overlay id='overlay-schedtruck' comment='overlay-schedtruck' open={!!ctx} onClose={onClose}>
      <div className='modal full' data-comment='schedtruck-modal' data-component='dialog'>
        <ModalHead
          comment='schedtruck-head'
          titleComment='schedtruck-title'
          descComment='schedtruck-desc'
          title={
            ctx
              ? `Truck ${ctx.truckId}${truck ? ` · ${truck.location}` : ''} · ${ctx.date === 'all' ? 'All Scheduled Orders' : fmtDate(ctx.date)}`
              : 'Truck'
          }
          desc='Scheduled orders for this truck — select orders, build Loads, reschedule.'
          onClose={onClose}
        />
        <div className='modal-body' id='schedtruck-body' data-comment='schedtruck-body'>
          {ctx ? (
            <>
              {loadsHere.length ? (
                <div
                  className='loadpills'
                  data-comment={`schm-loadpills-${ctx.truckId}`}
                  style={{ margin: '0 14px 12px' }}
                >
                  {loadsHere.map(load => (
                    <button
                      className={`loadpill ${loadFilter === load.id ? 'active' : ''}`}
                      data-comment={`schm-loadpill-${load.id}`}
                      onClick={() => setLoadFilter(load.id, ctx.truckId)}
                      key={load.id}
                    >
                      <span className='loadpill-dot ss-dot-unreleased' />
                      {loadLabel(load, loads)} · {loadWeight(load, orders).toLocaleString('en-US')}{' '}
                      lb · Unreleased
                    </button>
                  ))}
                  <span className='loadpill ghost' data-comment={`schm-loadghost-${ctx.truckId}`}>
                    + {nextLoadLabel(ctx.truckId, loads)}
                  </span>
                </div>
              ) : null}
              <TruckGrid truckId={ctx.truckId} activeDay={ctx.date} />
            </>
          ) : null}
        </div>
      </div>
    </Overlay>
  )
}
