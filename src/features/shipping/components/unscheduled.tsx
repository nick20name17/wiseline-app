import { CalendarDays, ChevronRight, History, NotebookPen } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import { fmtDate } from '../format'
import { orderMatchesSearch, sortByPriority, unscheduledOrders } from '../selectors'
import { shippingStore, toggleUnschedExpand, toggleUnschedSel } from '../store'
import { openCompleted, openScheduleForSelection, openTruckNotes, showToast } from '../ui'
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

/** N-166 */
const DATA_COLUMNS: Column[] = [
  { key: 'entry', label: 'Entry', width: '78px' },
  { key: 'ship', label: 'Ship', width: '78px' },
  { key: 'order', label: 'Order #', width: '112px' },
  { key: 'customer', label: 'Customer' },
  { key: 'address', label: 'Address', width: '150px' },
  { key: 'city', label: 'City', width: '104px' },
  { key: 'map', label: 'Map', width: '58px' },
  { key: 'weight', label: 'Weight', width: '92px' },
  { key: 'length', label: 'Length', width: '78px' },
  { key: 'via', label: 'Ship Via', width: '120px' },
  { key: 'priority', label: 'Priority', width: '128px' },
  { key: 'notes', label: 'Notes', width: '58px' }
]

/**
 * Orders with no ship date, worst priority first.
 *
 * The Ship column reads the *requested* date, which the seed does not carry — an order here has been
 * given no date at all, and the dash is that. Setting one is what moves it to Scheduled.
 */
export const Unscheduled = () => {
  const { headers, cells } = useColumnOrder('shp-uns', DATA_COLUMNS, { notify: showToast })
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
        <button className='btn btn-ghost' data-comment='uns-completed' onClick={openCompleted}>
          <History style={{ width: '14px', height: '14px' }} />
          Completed orders · past 90 days
        </button>
        <button className='btn btn-ghost' data-comment='uns-trucknotes' onClick={openTruckNotes}>
          <NotebookPen style={{ width: '14px', height: '14px' }} />
          Trucks Notes
        </button>
        <button
          className='btn btn-primary'
          data-comment='uns-schedule'
          disabled={!selectedCount}
          onClick={openScheduleForSelection}
        >
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
                  {headers}
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
                        {cells({
                          entry: (
                            <td
                              data-col='entry'
                              className='cell-num muted'
                              data-comment={`uns-entry-${order.id}`}
                            >
                              {fmtDate(order.entryDate)}
                            </td>
                          ),
                          ship: (
                            <td
                              data-col='ship'
                              className='cell-num subtle'
                              data-comment={`uns-ship-${order.id}`}
                            >
                              {order.reqShip ? fmtDate(order.reqShip) : '—'}
                            </td>
                          ),
                          order: (
                            <td
                              data-col='order'
                              className='cell-order'
                              data-comment={`uns-order-${order.id}`}
                            >
                              {order.order}
                              {order.pickup ? (
                                <span
                                  className='pickup-badge'
                                  data-comment={`uns-pickup-${order.id}`}
                                >
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
                          ),
                          customer: (
                            <td
                              data-col='customer'
                              className='cell-cust trunc'
                              data-comment={`uns-cust-${order.id}`}
                            >
                              {order.customer}
                            </td>
                          ),
                          address: (
                            <td
                              data-col='address'
                              className='trunc'
                              data-comment={`uns-addr-${order.id}`}
                            >
                              {order.address}
                            </td>
                          ),
                          city: (
                            <td
                              data-col='city'
                              className='trunc'
                              data-comment={`uns-city-${order.id}`}
                            >
                              {order.city}
                            </td>
                          ),
                          map: (
                            <td data-col='map' data-comment={`uns-map-${order.id}`}>
                              <MapButton order={order} />
                            </td>
                          ),
                          weight: (
                            <td
                              data-col='weight'
                              className='cell-num'
                              data-comment={`uns-weight-${order.id}`}
                            >
                              {order.weight.toLocaleString('en-US')} lb
                            </td>
                          ),
                          length: (
                            <td
                              data-col='length'
                              className='cell-num'
                              data-comment={`uns-length-${order.id}`}
                            >
                              {order.longestLength}"
                            </td>
                          ),
                          via: (
                            <td data-col='via' data-comment={`uns-shipvia-${order.id}`}>
                              <ShipViaCell order={order} />
                            </td>
                          ),
                          priority: (
                            <td data-col='priority' data-comment={`uns-pri-${order.id}`}>
                              <PriorityCell order={order} />
                            </td>
                          ),
                          notes: (
                            <td data-col='notes' data-comment={`uns-notes-${order.id}`}>
                              <NotesButton order={order} />
                            </td>
                          )
                        })}
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
