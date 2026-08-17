import { Fragment } from 'react'
import { ArrowRight, ChevronRight } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate } from '../format'
import {
  loadingLoads,
  loadLabel,
  loadOverdue,
  loadStatusCls,
  loadStatusLabel,
  loadWeight,
  orderById,
  orderMatchesSearch,
  orderOverdue,
  truckById
} from '../selectors'
import {
  driverLeftWarehouse,
  setLoadingSubTab,
  shippingStore,
  toggleLoadingRowExpand
} from '../store'
import { showToast } from '../ui'
import { NotePreviewRow, NotesButton, OrderStatusPill, PackageExpandRow } from './bits'

import type { Load, ShippingState } from '../types'

/** Which truck's loading day is open. */
export type LoadTruckCtx = { truckId: number; date: string }

const COLUMNS = 8

/** N-166 */
const DATA_COLUMNS: Column[] = [
  { key: 'order', label: 'Order #', width: '112px' },
  { key: 'customer', label: 'Customer' },
  { key: 'address', label: 'Address', width: '160px' },
  { key: 'city', label: 'City', width: '110px' },
  { key: 'weight', label: 'Weight', width: '96px' },
  { key: 'status', label: 'Status', width: '124px' },
  { key: 'notes', label: 'Notes', width: '58px' }
]

/** Every stop on the given loads, in the order the driver drives them. */
const LoadingGrid = ({
  loads,
  truckId,
  state
}: {
  loads: Load[]
  truckId: number
  state: ShippingState
}) => {
  const { headers, cells } = useColumnOrder('shp-load', DATA_COLUMNS, { notify: showToast })
  const orders = loads
    .flatMap(load => load.sequence)
    .map(id => orderById(id, state.orders))
    .filter((order): order is NonNullable<typeof order> => !!order)

  return (
    <div className='table-wrap' data-comment={`ldg-truckgridwrap-${truckId}`}>
      <div className='table-scroll'>
        <table className='grid' data-comment={`ldg-truckgrid-${truckId}`}>
          <thead>
            <tr>
              <th style={{ width: '22px' }} />
              {headers}
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const expanded = state.expLoadingRows.includes(order.id)

              return (
                <Fragment key={order.id}>
                  <tr
                    className={`row-order ${orderOverdue(order) ? 'overdue' : ''}`}
                    data-comment={`ldg-row-${order.id}`}
                    onClick={event => {
                      if (
                        (event.target as HTMLElement).closest(
                          'button,input,select,textarea,a,label,[data-pop-anchor],.chk'
                        )
                      )
                        return
                      toggleLoadingRowExpand(order.id)
                    }}
                  >
                    <td>
                      <button
                        aria-label='Toggle details'
                        className={`expander ${expanded ? 'open' : ''}`}
                        data-comment={`ldg-exp-${order.id}`}
                        onClick={() => toggleLoadingRowExpand(order.id)}
                      >
                        <ChevronRight style={{ width: '14px', height: '14px' }} />
                      </button>
                    </td>
                    {cells({
                      order: (
                        <td
                          data-col='order'
                          className='cell-order'
                          data-comment={`ldg-order-${order.id}`}
                        >
                          {order.order}
                        </td>
                      ),
                      customer: (
                        <td
                          data-col='customer'
                          className='cell-cust trunc'
                          data-comment={`ldg-cust-${order.id}`}
                        >
                          {order.customer}
                        </td>
                      ),
                      address: (
                        <td
                          data-col='address'
                          className='trunc'
                          data-comment={`ldg-addr-${order.id}`}
                        >
                          {order.address}
                        </td>
                      ),
                      city: (
                        <td data-col='city' className='trunc' data-comment={`ldg-city-${order.id}`}>
                          {order.city}
                        </td>
                      ),
                      weight: (
                        <td
                          data-col='weight'
                          className='cell-num'
                          data-comment={`ldg-weight-${order.id}`}
                        >
                          {order.weight.toLocaleString('en-US')} lb
                        </td>
                      ),
                      status: (
                        <td data-col='status' data-comment={`ldg-status-${order.id}`}>
                          <OrderStatusPill order={order} />
                        </td>
                      ),
                      notes: (
                        <td data-col='notes' data-comment={`ldg-notes-${order.id}`}>
                          <NotesButton order={order} />
                        </td>
                      )
                    })}
                  </tr>
                  {expanded ? (
                    <PackageExpandRow order={order} ctx='ldg' colSpan={COLUMNS} />
                  ) : state.notesExpanded ? (
                    <NotePreviewRow order={order} ctx='ldg' colSpan={COLUMNS} />
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** By Load: one card per load, each expanding to the same grid over just its own stops. */
const LoadCards = ({
  loads,
  truckId,
  state
}: {
  loads: Load[]
  truckId: number
  state: ShippingState
}) => (
  <div className='load-cards' data-comment={`ldg-loadcards-${truckId}`}>
    {loads.map(load => {
      const key = `ld${load.id}`
      const expanded = state.expLoadingRows.includes(key)

      return (
        <div
          className={`load-card ${loadOverdue(load) ? 'overdue' : ''}`}
          data-comment={`ldg-loadcard-${load.id}`}
          key={load.id}
        >
          <div
            className='load-card-head'
            data-comment={`ldg-loadcardhead-${load.id}`}
            style={{ cursor: 'pointer' }}
            onClick={() => toggleLoadingRowExpand(key)}
          >
            <span className='load-card-title' data-comment={`ldg-loadcardtitle-${load.id}`}>
              {loadLabel(load, state.loads)}
            </span>
            <span data-comment={`ldg-loadcardstatus-${load.id}`}>
              <span
                className={`status ${loadStatusCls(load.status)}`}
                data-comment={`stat-ld${load.id}`}
              >
                <span className='st-dot' />
                {loadStatusLabel(load.status)}
              </span>
            </span>
            <span className='mono' data-comment={`ldg-loadcardweight-${load.id}`}>
              {loadWeight(load, state.orders).toLocaleString('en-US')} lb
            </span>
            <div className='toolbar-spacer' />
            {load.status === 'loaded' ? (
              <button
                className='btn btn-primary btn-sm'
                data-comment={`ldg-driverleft-${load.id}`}
                onClick={event => {
                  event.stopPropagation()
                  const label = loadLabel(load, state.loads)
                  if (driverLeftWarehouse(load.id))
                    showToast(`${label} — driver left warehouse, now En Route`)
                }}
              >
                <ArrowRight style={{ width: '14px', height: '14px' }} />
                Driver left warehouse
              </button>
            ) : null}
          </div>
          {expanded ? <LoadingGrid loads={[load]} truckId={truckId} state={state} /> : null}
        </div>
      )
    })}
  </div>
)

/**
 * One truck's loading day, near-fullscreen.
 *
 * By Truck is every stop the truck makes that day in one list; By Load splits it back into the loads it
 * runs. The dispatcher watches here — the ticks arrive from the warehouse's own screen — and the one
 * button is the driver pulling out.
 */
export const LoadTruckModal = ({
  ctx,
  onClose
}: {
  ctx: LoadTruckCtx | null
  onClose: () => void
}) => {
  const state = useStore(shippingStore, current => current)
  const truck = ctx ? truckById(ctx.truckId, state.trucks) : null

  const query = (state.search || '').trim().toLowerCase()
  const loads = ctx
    ? loadingLoads(state.loads)
        .filter(load => load.date === ctx.date && load.truckId === ctx.truckId)
        .filter(
          load =>
            !query ||
            load.orderIds.some(id => {
              const order = orderById(id, state.orders)
              return order && orderMatchesSearch(order, state.search)
            })
        )
    : []

  return (
    <Overlay id='overlay-loadtruck' comment='overlay-loadtruck' open={!!ctx} onClose={onClose}>
      <div className='modal full' data-comment='loadtruck-modal' data-component='dialog'>
        <ModalHead
          comment='loadtruck-head'
          titleComment='loadtruck-title'
          descComment='loadtruck-desc'
          title={
            ctx
              ? `Truck ${ctx.truckId}${truck ? ` · ${truck.location}` : ''} · ${fmtDate(ctx.date)}`
              : 'Truck'
          }
          desc='Packages scanned onto this truck, by truck or by load.'
          onClose={onClose}
        />
        <div className='modal-body' id='loadtruck-body' data-comment='loadtruck-body'>
          {ctx ? (
            <>
              <div
                className='loadpills'
                data-comment={`ldgm-loadpills-${ctx.truckId}`}
                style={{ marginBottom: '12px' }}
              >
                {loads.map(load => (
                  <span
                    className='loadpill'
                    data-comment={`ldgm-loadpill-${load.id}`}
                    key={load.id}
                  >
                    <span className={`loadpill-dot ss-dot-${load.status}`} />
                    {loadLabel(load, state.loads)} ·{' '}
                    {loadWeight(load, state.orders).toLocaleString('en-US')} lb ·{' '}
                    {loadStatusLabel(load.status)}
                  </span>
                ))}
              </div>
              <div className='subtabs' data-comment={`ldgm-subtabs-${ctx.truckId}`}>
                <button
                  className={`subtab ${state.loadingSubTab === 'truck' ? 'active' : ''}`}
                  data-comment={`ldgm-subtab-truck-${ctx.truckId}`}
                  onClick={() => setLoadingSubTab('truck')}
                >
                  By Truck
                </button>
                <button
                  className={`subtab ${state.loadingSubTab === 'load' ? 'active' : ''}`}
                  data-comment={`ldgm-subtab-load-${ctx.truckId}`}
                  onClick={() => setLoadingSubTab('load')}
                >
                  By Load
                </button>
              </div>
              {state.loadingSubTab === 'truck' ? (
                <LoadingGrid loads={loads} truckId={ctx.truckId} state={state} />
              ) : (
                <LoadCards loads={loads} truckId={ctx.truckId} state={state} />
              )}
            </>
          ) : null}
        </div>
      </div>
    </Overlay>
  )
}
