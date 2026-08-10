import { CalendarDays, ChevronRight, History, NotebookPen } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import { orderMatchesSearch, sortByPriority, unscheduledOrders } from '../selectors'
import { shippingStore, toggleUnschedExpand, toggleUnschedSel } from '../store'
import { openTruckNotes } from '../ui'
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

const COLUMNS = 14

/**
 * Orders with no ship date, worst priority first.
 *
 * The Ship column reads the *requested* date, which the seed does not carry — an order here has been
 * given no date at all, and the dash is that. Setting one is what moves it to Scheduled.
 */
export const Unscheduled = () => {
  const state = useStore(shippingStore, current => current)
  const rows = sortByPriority(
    unscheduledOrders(state.orders).filter(order => orderMatchesSearch(order, state.search)),
    state.priorities
  )
  const selectedCount = state.selUnscheduled.filter(id =>
    rows.some(order => order.id === id)
  ).length

  return (
    <>
      <div className='toolbar' data-comment='uns-toolbar'>
        <span className='toolbar-info' data-comment='uns-count'>
          {selectedCount ? (
            <>
              <b>{selectedCount}</b> selected
            </>
          ) : (
            <>
              <b>{rows.length}</b> unscheduled order{rows.length !== 1 ? 's' : ''}
            </>
          )}
        </span>
        <div className='toolbar-spacer' />
        <button className='btn btn-ghost' data-comment='uns-completed'>
          <History style={{ width: '14px', height: '14px' }} />
          Completed orders · past 90 days
        </button>
        <button className='btn btn-ghost' data-comment='uns-trucknotes' onClick={openTruckNotes}>
          <NotebookPen style={{ width: '14px', height: '14px' }} />
          Trucks Notes
        </button>
        <button className='btn btn-primary' data-comment='uns-schedule' disabled={!selectedCount}>
          <CalendarDays style={{ width: '14px', height: '14px' }} />
          Schedule{selectedCount ? ` (${selectedCount})` : ''}
        </button>
      </div>

      {!rows.length ? (
        <EmptyState
          title='No unscheduled orders'
          text='New orders land here once ready to ship. Set a Ship Date and truck to move them into Scheduled.'
          commentKey='uns'
        />
      ) : (
        <div className='table-wrap' data-comment='uns-table-wrap'>
          <div className='table-scroll'>
            <table className='grid' data-comment='uns-table'>
              <thead>
                <tr>
                  <th style={{ width: '26px' }} />
                  <th style={{ width: '22px' }} />
                  <th style={{ width: '64px' }}>Entry</th>
                  <th style={{ width: '64px' }}>Ship</th>
                  <th style={{ width: '132px' }}>Order #</th>
                  <th style={{ width: '150px' }}>Customer</th>
                  <th style={{ width: '160px' }}>Address</th>
                  <th style={{ width: '100px' }}>City</th>
                  <th style={{ width: '36px' }}>Map</th>
                  <th style={{ width: '70px' }}>Weight</th>
                  <th style={{ width: '76px' }}>Length</th>
                  <th style={{ width: '118px' }}>Ship Via</th>
                  <th style={{ width: '126px' }}>Priority</th>
                  <th style={{ width: '48px' }}>Notes</th>
                </tr>
              </thead>
              <tbody data-comment='uns-tbody'>
                {rows.map(order => {
                  const selected = state.selUnscheduled.includes(order.id)
                  const expanded = state.expUnscheduled.includes(order.id)

                  return (
                    <Fragment key={order.id}>
                      <tr
                        className={`row-order ${selected ? 'selected' : ''}`}
                        data-comment={`uns-row-${order.id}`}
                        onClick={event => {
                          if (
                            (event.target as HTMLElement).closest(
                              'button,input,select,textarea,a,label,[data-pop-anchor],.chk'
                            )
                          )
                            return
                          toggleUnschedExpand(order.id)
                        }}
                      >
                        <td>
                          <input
                            type='checkbox'
                            className='chk'
                            data-comment={`uns-chk-${order.id}`}
                            checked={selected}
                            onChange={() => toggleUnschedSel(order.id)}
                          />
                        </td>
                        <td>
                          <button
                            aria-label='Toggle details'
                            className={`expander ${expanded ? 'open' : ''}`}
                            data-comment={`uns-exp-${order.id}`}
                            onClick={() => toggleUnschedExpand(order.id)}
                          >
                            <ChevronRight style={{ width: '14px', height: '14px' }} />
                          </button>
                        </td>
                        <td className='cell-num muted' data-comment={`uns-entry-${order.id}`}>
                          {fmtDate(order.entryDate)}
                        </td>
                        <td className='cell-num subtle' data-comment={`uns-ship-${order.id}`}>
                          {order.reqShip ? fmtDate(order.reqShip) : '—'}
                        </td>
                        <td className='cell-order' data-comment={`uns-order-${order.id}`}>
                          {order.order}
                          {order.pickup ? (
                            <span className='pickup-badge' data-comment={`uns-pickup-${order.id}`}>
                              Pickup
                            </span>
                          ) : null}
                          {order.status ? (
                            <span
                              data-comment={`uns-status-${order.id}`}
                              style={{ display: 'block', marginTop: '3px' }}
                            >
                              <OrderStatusPill order={order} />
                            </span>
                          ) : null}
                        </td>
                        <td className='cell-cust trunc' data-comment={`uns-cust-${order.id}`}>
                          {order.customer}
                        </td>
                        <td className='trunc' data-comment={`uns-addr-${order.id}`}>
                          {order.address}
                        </td>
                        <td className='trunc' data-comment={`uns-city-${order.id}`}>
                          {order.city}
                        </td>
                        <td data-comment={`uns-map-${order.id}`}>
                          <MapButton order={order} />
                        </td>
                        <td className='cell-num' data-comment={`uns-weight-${order.id}`}>
                          {order.weight.toLocaleString('en-US')} lb
                        </td>
                        <td className='cell-num' data-comment={`uns-length-${order.id}`}>
                          {order.longestLength}"
                        </td>
                        <td data-comment={`uns-shipvia-${order.id}`}>
                          <ShipViaCell order={order} />
                        </td>
                        <td data-comment={`uns-pri-${order.id}`}>
                          <PriorityCell order={order} />
                        </td>
                        <td data-comment={`uns-notes-${order.id}`}>
                          <NotesButton order={order} />
                        </td>
                      </tr>

                      {expanded ? (
                        <ExpandRow order={order} ctx='uns' colSpan={COLUMNS} />
                      ) : state.notesExpanded ? (
                        <NotePreviewRow order={order} ctx='uns' colSpan={COLUMNS} />
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
