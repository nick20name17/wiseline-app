import { CalendarCheck, CalendarDays, ChevronRight, Split } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import { matchesSearch, truckDisplay, unscheduledOrders } from '../selectors'
import { accessoriesStore, toggleExpand, toggleLineSelect, toggleOrderSelect } from '../store'
import {
  EmptyState,
  LineNoteButton,
  OrderNoteButton,
  PriorityCell,
  SchedDetailBar,
  ShipViaCell
} from './bits'

import type { Order } from '../types'

/** An order opened in Unscheduled: its details, then every line with a tick box for a partial schedule. */
const Subrow = ({ order }: { order: Order }) => {
  const splitOrderId = useStore(accessoriesStore, state => state.splitOrderId)
  const selectedLineIds = useStore(accessoriesStore, state => state.selectedLineIds)
  const splitCount = splitOrderId === order.id ? selectedLineIds.length : 0

  return (
    <tr className='subrow' data-comment={`uns-subrow-${order.id}`}>
      <td colSpan={8}>
        <div className='subwrap' data-comment={`uns-subwrap-${order.id}`}>
          <SchedDetailBar order={order} ctx='uns' />
          <div className='subhead' data-comment={`uns-subhead-${order.id}`}>
            <span className='subhead-title' data-comment={`uns-subtitle-${order.id}`}>
              Line items — tick some to schedule them separately (partial)
            </span>
            <button
              className='btn btn-sm'
              data-comment={`uns-split-${order.id}`}
              disabled={!splitCount}
            >
              <Split style={{ width: '14px', height: '14px' }} />
              Schedule selected{splitCount ? ` (${splitCount})` : ''}
            </button>
          </div>

          {order.items.map(item => {
            const scheduled = order.isSplit && item.scheduledDate
            const selected = splitOrderId === order.id && selectedLineIds.includes(item.id)

            return (
              <div
                className={`sched-line${scheduled ? ' locked' : ''}`}
                data-comment={`uns-line-${item.id}`}
                key={item.id}
              >
                <input
                  type='checkbox'
                  className='chk'
                  data-comment={`uns-linechk-${item.id}`}
                  checked={selected}
                  disabled={!!scheduled}
                  onChange={() => toggleLineSelect(order.id, item.id)}
                />
                <div className='sched-line-main' data-comment={`uns-linemain-${item.id}`}>
                  <span className='mono subtle' data-comment={`uns-lipid-${item.id}`}>
                    {item.productId}
                  </span>
                  <span className='trunc' data-comment={`uns-lidesc-${item.id}`}>
                    {item.description}
                  </span>
                  <span className='chip' data-comment={`uns-liqty-${item.id}`}>
                    {item.qtyOrdered} ordered
                  </span>
                  {scheduled ? (
                    <span className='chip' data-comment={`uns-lisched-${item.id}`}>
                      <CalendarCheck style={{ width: '12px', height: '12px' }} />
                      scheduled {fmtDate(item.scheduledDate)}
                    </span>
                  ) : null}
                </div>
                <LineNoteButton item={item} commentKey={`uns-linote-${item.id}`} />
              </div>
            )
          })}
        </div>
      </td>
    </tr>
  )
}

/**
 * New EBMS orders waiting on a Prep Date.
 *
 * A partly-scheduled order shows here too, for its remainder — and its row checkbox is disabled, because
 * the whole order can no longer be scheduled at once. That is what Schedule selected inside it is for.
 */
export const Unscheduled = () => {
  const state = useStore(accessoriesStore, current => current)
  const rows = unscheduledOrders().filter(matchesSearch)
  const selCount = state.selectedOrderIds.filter(id =>
    rows.some(order => order.id === id && !order.isSplit)
  ).length

  return (
    <>
      <div className='toolbar' data-comment='uns-toolbar'>
        <span className='toolbar-info' data-comment='uns-count'>
          {selCount ? (
            <>
              <b>{selCount}</b> selected
            </>
          ) : (
            <>
              <b>{rows.length}</b> unscheduled order{rows.length !== 1 ? 's' : ''}
            </>
          )}
        </span>
        <div className='toolbar-spacer' />
        <button className='btn btn-primary' data-comment='uns-schedule' disabled={!selCount}>
          <CalendarDays style={{ width: '14px', height: '14px' }} />
          Set Prep Date{selCount ? ` (${selCount})` : ''}
        </button>
      </div>

      {!rows.length ? (
        <EmptyState
          title='Nothing unscheduled'
          text='New Accessories Sales Orders from EBMS wait here until a Manager assigns a Prep Date.'
          commentKey='uns'
        />
      ) : (
        <div className='table-wrap' data-comment='uns-wrap'>
          <table className='grid' data-comment='uns-table'>
            <thead>
              <tr>
                <th style={{ width: '40px' }} />
                <th style={{ width: '30px' }} />
                <th style={{ width: '170px' }}>Order #</th>
                <th style={{ width: '150px' }}>Priority</th>
                <th>Customer</th>
                <th style={{ width: '110px' }}>Truck</th>
                <th style={{ width: '110px' }}>Ship Via</th>
                <th style={{ width: '64px' }}>Notes</th>
              </tr>
            </thead>
            <tbody data-comment='uns-tbody'>
              {rows.map(order => {
                const selected = state.selectedOrderIds.includes(order.id)
                const expanded = state.expandedIds.includes(order.id)

                return (
                  <Fragment key={order.id}>
                    <tr
                      className={`row-order${selected ? ' selected' : ''}`}
                      data-comment={`uns-row-${order.id}`}
                      onClick={event => {
                        if (
                          (event.target as HTMLElement).closest(
                            'button,input,textarea,a,label,[data-pop-anchor],.chk'
                          )
                        )
                          return
                        toggleExpand(order.id)
                      }}
                    >
                      <td data-comment={`uns-chkcell-${order.id}`}>
                        <input
                          type='checkbox'
                          className='chk'
                          data-comment={`uns-chk-${order.id}`}
                          checked={selected}
                          disabled={order.isSplit}
                          {...(order.isSplit
                            ? {
                                title: 'Partly scheduled — use Schedule selected inside the order'
                              }
                            : {})}
                          onChange={() => toggleOrderSelect(order.id)}
                        />
                      </td>
                      <td data-comment={`uns-expcell-${order.id}`}>
                        <button
                          aria-label='Toggle details'
                          className={`expander${expanded ? ' open' : ''}`}
                          data-comment={`uns-exp-${order.id}`}
                          onClick={() => toggleExpand(order.id)}
                        >
                          <ChevronRight style={{ width: '14px', height: '14px' }} />
                        </button>
                      </td>
                      <td className='cell-order' data-comment={`uns-ono-${order.id}`}>
                        {order.orderNumber}
                        {order.isSplit ? (
                          <>
                            {' '}
                            <span
                              className='split-badge'
                              data-comment={`uns-splitbadge-${order.id}`}
                            >
                              Partial
                            </span>
                          </>
                        ) : null}
                      </td>
                      <td data-comment={`uns-pricell-${order.id}`}>
                        <PriorityCell order={order} />
                      </td>
                      <td className='cell-cust trunc' data-comment={`uns-cust-${order.id}`}>
                        {order.customer}
                      </td>
                      <td className='mono muted' data-comment={`uns-truck-${order.id}`}>
                        {truckDisplay(order)}
                      </td>
                      <td data-comment={`uns-shipvia-${order.id}`}>
                        <ShipViaCell order={order} />
                      </td>
                      <td data-comment={`uns-notes-${order.id}`}>
                        <OrderNoteButton order={order} />
                      </td>
                    </tr>

                    {expanded ? <Subrow order={order} /> : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
