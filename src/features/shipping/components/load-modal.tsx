import { Fragment, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, ChevronUp, GripVertical } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'
import { usePopover } from '@/components/shell/pop'

import { fmtDate } from '../format'
import { computeRoute, routeEtaLabel } from '../route'
import { loadById, loadLabel, loadStatusLabel, orderOverdue, truckById } from '../selectors'
import {
  moveStopBy,
  moveStopTo,
  releaseToLoading,
  setLoadTerm,
  setLoadVehicle,
  shippingStore
} from '../store'
import { showToast } from '../ui'
import { LineItemsTable, MapButton, NotesButton, OrderStatusPill, ShipViaCell } from './bits'

import type { RouteResult } from '../route'
import type { Load, Truck } from '../types'

import type { Point } from '../route'

const TERMS = ['Prepaid', 'Collect', 'Third Party']

/**
 * The route as a shape rather than a map.
 *
 * The mock coordinates are projected onto the box, so both the path and the numbering visibly follow
 * whatever order the stops were dragged into — which is what the dispatcher is checking.
 */
const RouteMap = ({ points }: { points: Point[] }) => {
  const width = 600
  const height = 180
  const padX = 44
  const padY = 26

  const lats = points.map(point => point.lat)
  const lngs = points.map(point => point.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const spanLat = maxLat - minLat || 0.01
  const spanLng = maxLng - minLng || 0.01

  const projected = points.map(point => ({
    x: padX + ((point.lng - minLng) / spanLng) * (width - 2 * padX),
    y: height - padY - ((point.lat - minLat) / spanLat) * (height - 2 * padY)
  }))

  const origin = projected[0]
  if (!origin) return null

  const path = projected
    .map((point, index) => `${index ? ' L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join('')

  return (
    <div className='route-mapbox' data-comment='loadm-routemap'>
      <svg viewBox='0 0 600 180' width='100%' height='180'>
        <rect width='600' height='180' fill='var(--surface-3)' />
        <path
          d={path}
          stroke='var(--accent-border)'
          strokeWidth='4'
          fill='none'
          strokeDasharray='2 8'
        />
        <circle cx={origin.x.toFixed(1)} cy={origin.y.toFixed(1)} r='8' fill='var(--text-muted)' />
        <text
          x={origin.x.toFixed(1)}
          y={(origin.y + 3.5).toFixed(1)}
          fontSize='8'
          fill='#fff'
          textAnchor='middle'
          fontFamily='var(--font-mono)'
        >
          W
        </text>
        {projected.slice(1).map((point, index) => (
          <Fragment key={index}>
            <circle cx={point.x.toFixed(1)} cy={point.y.toFixed(1)} r='10' fill='var(--accent)' />
            <text
              x={point.x.toFixed(1)}
              y={(point.y + 4).toFixed(1)}
              fontSize='10'
              fill='#fff'
              textAnchor='middle'
              fontFamily='var(--font-mono)'
            >
              {index + 1}
            </text>
          </Fragment>
        ))}
      </svg>
    </div>
  )
}

/** What is on the load, and the two fields the dispatcher can still change about it. */
const LoadDetails = ({
  load,
  truck,
  route,
  eta
}: {
  load: Load
  truck: Truck | undefined
  route: RouteResult
  eta: string
}) => {
  const { openPop, popNode } = usePopover()
  const [expanded, setExpanded] = useState<number[]>([])

  const toggleRow = (orderId: number) =>
    setExpanded(current =>
      current.includes(orderId) ? current.filter(id => id !== orderId) : [...current, orderId]
    )

  const orders = route.orders

  return (
    <>
      <div className='strow-main' data-comment='loadm-fields' style={{ marginBottom: '16px' }}>
        <div>
          <div className='strow-label'>Ship Date</div>
          <div className='strow-val mono' data-comment='loadm-shipdate'>
            {fmtDate(load.date)}
          </div>
        </div>
        <div>
          <div className='strow-label'>Delivery Term</div>
          <button
            className='field-btn'
            data-pop-anchor
            data-comment='loadm-term-btn'
            onClick={event => {
              event.stopPropagation()
              openPop<string>(
                event.currentTarget,
                TERMS.map(term => ({ label: term, value: term })),
                value => setLoadTerm(load.id, value),
                load.deliveryTerm
              )
            }}
          >
            {load.deliveryTerm}
            <ChevronDown />
          </button>
        </div>
        <div>
          <div className='strow-label'>Load / Unload Time</div>
          <div className='strow-val mono' data-comment='loadm-lutime'>
            {load.loadUnloadTime}
          </div>
        </div>
        <div>
          <div className='strow-label'>Route Miles</div>
          <div className='strow-val mono' data-comment='loadm-miles'>
            {route.miles} mi
          </div>
        </div>
        <div>
          <div className='strow-label'>Selected Vehicle</div>
          <button
            className='field-btn'
            data-pop-anchor
            data-comment='loadm-vehicle-btn'
            onClick={event => {
              event.stopPropagation()
              openPop<string>(
                event.currentTarget,
                ['A', 'B', 'C'].map(suffix => ({
                  label: `Unit ${load.truckId}-${suffix}`,
                  value: `Unit ${load.truckId}-${suffix}`
                })),
                value => setLoadVehicle(load.id, value),
                load.vehicle
              )
            }}
          >
            {load.vehicle}
            <ChevronDown />
          </button>
        </div>
        <div>
          <div className='strow-label'>Est. Arrival (ETA)</div>
          <div className='strow-val mono' data-comment='loadm-eta'>
            {eta}
          </div>
        </div>
      </div>

      <div
        className='toolbar-info subtle'
        data-comment='loadm-lihint'
        style={{ margin: '-4px 0 8px', fontSize: '11.5px' }}
      >
        Expand any order to see its line items.
      </div>

      <div className='table-wrap' data-comment='loadm-tablewrap'>
        <div className='table-scroll'>
          <table className='grid' data-comment='loadm-table'>
            <thead>
              <tr>
                <th style={{ width: '22px' }} />
                <th style={{ width: '88px' }}>Order #</th>
                <th style={{ width: '150px' }}>Customer</th>
                <th style={{ width: '150px' }}>Address</th>
                <th style={{ width: '90px' }}>City</th>
                <th style={{ width: '36px' }}>Map</th>
                <th style={{ width: '70px' }}>Weight</th>
                <th style={{ width: '70px' }}>Length</th>
                <th style={{ width: '110px' }}>Ship Via</th>
                <th style={{ width: '112px' }}>Status</th>
                <th style={{ width: '44px' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const open = expanded.includes(order.id)

                return (
                  <Fragment key={order.id}>
                    <tr
                      className={`row-order ${orderOverdue(order) ? 'overdue' : ''}`}
                      data-comment={`loadm-row-${order.id}`}
                      style={{ cursor: 'pointer' }}
                      onClick={event => {
                        if (
                          (event.target as HTMLElement).closest(
                            'button,input,select,textarea,a,label,[data-pop-anchor],.chk'
                          )
                        )
                          return
                        toggleRow(order.id)
                      }}
                    >
                      <td>
                        <button
                          aria-label='Toggle line items'
                          className={`expander ${open ? 'open' : ''}`}
                          data-comment={`loadm-exp-${order.id}`}
                          onClick={() => toggleRow(order.id)}
                        >
                          <ChevronRight style={{ width: '14px', height: '14px' }} />
                        </button>
                      </td>
                      <td className='cell-order' data-comment={`loadm-order-${order.id}`}>
                        {order.order}
                      </td>
                      <td className='cell-cust trunc' data-comment={`loadm-cust-${order.id}`}>
                        {order.customer}
                      </td>
                      <td className='trunc' data-comment={`loadm-addr-${order.id}`}>
                        {order.address}
                      </td>
                      <td className='trunc' data-comment={`loadm-city-${order.id}`}>
                        {order.city}
                      </td>
                      <td data-comment={`loadm-map-${order.id}`}>
                        <MapButton order={order} />
                      </td>
                      <td className='cell-num' data-comment={`loadm-weight-${order.id}`}>
                        {order.weight.toLocaleString('en-US')} lb
                      </td>
                      <td
                        className={`cell-num${truck && order.longestLength > truck.maxLength ? ' over-txt' : ''}`}
                        data-comment={`loadm-length-${order.id}`}
                      >
                        {order.longestLength}"
                      </td>
                      <td data-comment={`loadm-shipvia-${order.id}`}>
                        <ShipViaCell order={order} />
                      </td>
                      <td data-comment={`loadm-status-${order.id}`}>
                        <OrderStatusPill order={order} />
                      </td>
                      <td data-comment={`loadm-notes-${order.id}`}>
                        <NotesButton order={order} />
                      </td>
                    </tr>
                    {open ? (
                      <tr className='subrow' data-comment={`loadm-subrow-${order.id}`}>
                        <td colSpan={11}>
                          <div className='subwrap' data-comment={`loadm-subwrap-${order.id}`}>
                            <LineItemsTable order={order} ctx='loadm' />
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
      </div>
      {popNode}
    </>
  )
}

/** The stops in delivery order, draggable — the mileage and the ETA follow whatever order they end in. */
const LoadRoute = ({ load, route, eta }: { load: Load; route: RouteResult; eta: string }) => {
  // a ref, not state: the stop being dragged changes nothing on screen until it is dropped
  const dragFrom = useRef<number | null>(null)
  const orders = route.orders

  return (
    <>
      <div className='route-summary' data-comment='loadm-routesummary'>
        <span>
          Stops <b data-comment='loadm-stops'>{orders.length}</b>
        </span>
        <span>
          Distance <b data-comment='loadm-dist'>{route.miles} mi</b>
        </span>
        <span>
          ETA <b data-comment='loadm-routeeta'>{eta}</b>
        </span>
      </div>
      <div
        className='toolbar-info subtle'
        data-comment='loadm-routehint'
        style={{ margin: '-4px 0 10px', fontSize: '11.5px' }}
      >
        Drag a stop (or use the arrows) to reorder — distance &amp; ETA recalculate from the new
        sequence.
      </div>
      <RouteMap points={route.points} />
      {orders.map((order, index) => (
        <div
          className='seq'
          draggable
          data-comment={`loadm-seq-${order.id}`}
          onDragStart={event => {
            dragFrom.current = index
            event.currentTarget.classList.add('dragging')
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', String(index))
          }}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault()
            if (dragFrom.current === null) return
            moveStopTo(load.id, dragFrom.current, index)
            dragFrom.current = null
          }}
          onDragEnd={event => event.currentTarget.classList.remove('dragging')}
          key={order.id}
        >
          <div className='seq-move' data-comment={`loadm-seqmove-${order.id}`}>
            <button
              className='seq-mv'
              data-comment={`loadm-sequp-${order.id}`}
              disabled={index === 0}
              onClick={() => moveStopBy(load.id, index, -1)}
            >
              <ChevronUp style={{ width: '14px', height: '14px' }} />
            </button>
            <button
              className='seq-mv'
              data-comment={`loadm-seqdown-${order.id}`}
              disabled={index === orders.length - 1}
              onClick={() => moveStopBy(load.id, index, 1)}
            >
              <ChevronDown style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
          <span className='stop-seq' data-comment={`loadm-seqnum-${order.id}`}>
            {index + 1}
          </span>
          <div className='stop-main'>
            <div className='stop-order' data-comment={`loadm-seqorder-${order.id}`}>
              {order.order}
            </div>
            <div className='stop-cust' data-comment={`loadm-seqaddr-${order.id}`}>
              {order.address}, {order.city}
            </div>
          </div>
          <GripVertical
            style={{ width: '14px', height: '14px', color: 'var(--text-subtle)' }}
            data-comment={`loadm-drag-${order.id}`}
          />
        </div>
      ))}
    </>
  )
}

/** One load: what is on it, in what order it is delivered, and the button that hands it over. */
export const LoadModal = ({ loadId, onClose }: { loadId: number | null; onClose: () => void }) => {
  const state = useStore(shippingStore, current => current)
  const [tab, setTab] = useState<'details' | 'route'>('details')

  const load = loadById(loadId, state.loads)
  const truck = load ? truckById(load.truckId, state.trucks) : undefined
  const route = load ? computeRoute(load, state) : null
  const orders = route?.orders ?? []
  const eta = load && route ? routeEtaLabel(load, route.totalMin) : ''

  const release = () => {
    if (!load) return
    const label = loadLabel(load, state.loads)
    if (releaseToLoading(load.id)) {
      showToast(`${label} released to Loading`)
      onClose()
    }
  }

  return (
    <Overlay id='overlay-load' comment='overlay-load' open={!!load} onClose={onClose}>
      <div className='modal wide' data-comment='load-modal' data-component='dialog'>
        <ModalHead
          comment='load-head'
          titleComment='load-title'
          descComment='load-desc'
          title={load && truck ? `${loadLabel(load, state.loads)} · Truck ${truck.id}` : 'Load'}
          desc={
            load
              ? `${fmtDate(load.date)} · ${orders.length} order${orders.length !== 1 ? 's' : ''} · ${loadStatusLabel(load.status)}`
              : ''
          }
          onClose={onClose}
        />
        <div className='modal-body' id='load-body' data-comment='load-body'>
          <div className='subtabs' data-comment='loadm-subtabs'>
            <button
              className={`subtab ${tab === 'details' ? 'active' : ''}`}
              data-comment='loadm-tab-details'
              onClick={() => setTab('details')}
            >
              Details
            </button>
            <button
              className={`subtab ${tab === 'route' ? 'active' : ''}`}
              data-comment='loadm-tab-route'
              onClick={() => setTab('route')}
            >
              Route
            </button>
          </div>

          {!load || !route ? null : tab === 'details' ? (
            <LoadDetails load={load} truck={truck} route={route} eta={eta} />
          ) : (
            <LoadRoute load={load} route={route} eta={eta} />
          )}
        </div>
        <div className='modal-foot' data-comment='load-foot'>
          <button
            className='btn btn-green'
            id='load-release'
            data-comment='load-releasebtn'
            disabled={load?.status !== 'unreleased'}
            onClick={release}
          >
            {load?.status === 'unreleased'
              ? 'Release To Loading'
              : 'Already released — see Loading tab'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
