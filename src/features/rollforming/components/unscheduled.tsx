import { CalendarDays, ChevronRight, Plus } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import {
  gaugeColourLabel,
  orderInGroup,
  orderMatchesSearch,
  unscheduledLineItemsOf,
  unscheduledOrders
} from '../selectors'
import { rollformingStore, toggleExpand, toggleOrderSelect } from '../store'
import { EmptyState, GroupTabs, NoteButton, PriorityCell } from './bits'
import { LineItemsSubrow } from './line-items'

const COLUMNS = 14

export const Unscheduled = () => {
  const state = useStore(rollformingStore, current => current)
  const rows = unscheduledOrders()
    .filter(orderMatchesSearch)
    .filter(order => orderInGroup(order, state.activeGroup))
  const selectedCount = state.selectedOrderIds.filter(id =>
    rows.some(order => order.id === id)
  ).length

  return (
    <>
      <GroupTabs prefix='uns' />

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
        <button className='btn' data-comment='uns-mreq'>
          <Plus style={{ width: '14px', height: '14px' }} />
          New Material Request
        </button>
        <button className='btn btn-primary' data-comment='uns-schedule' disabled={!selectedCount}>
          <CalendarDays style={{ width: '14px', height: '14px' }} />
          Schedule{selectedCount ? ` (${selectedCount})` : ''}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={`No unscheduled orders in ${state.activeGroup}`}
          text='New Rollforming Sales Orders from EBMS, and Material Requests from a Rollforming Machine, land here.'
          commentKey={`uns-${state.activeGroup.replace(/[^a-z0-9]+/gi, '-')}`}
        />
      ) : (
        <div className='table-wrap' data-comment='uns-wrap'>
          <table className='grid' data-comment='uns-table' style={{ minWidth: '1420px' }}>
            <thead>
              <tr>
                <th style={{ width: '36px' }} />
                <th style={{ width: '28px' }} />
                <th style={{ width: '76px' }}>Entry</th>
                <th style={{ width: '76px' }}>Ship</th>
                <th style={{ width: '106px' }}>Order #</th>
                <th>Customer</th>
                <th style={{ width: '150px' }}>Address</th>
                <th style={{ width: '110px' }}>City</th>
                <th style={{ width: '150px' }}>Gauge / Colour</th>
                <th style={{ width: '96px' }}>PO</th>
                <th style={{ width: '104px' }}>Salesman</th>
                <th style={{ width: '120px' }}>Ship Via</th>
                <th style={{ width: '130px' }}>Priority</th>
                <th style={{ width: '62px' }}>Notes</th>
              </tr>
            </thead>
            <tbody data-comment='uns-tbody'>
              {rows.map(order => {
                const selected = state.selectedOrderIds.includes(order.id)
                const expanded = state.expandedIds.includes(order.id)

                return (
                  <Fragment key={order.id}>
                    <tr
                      className={`row-order ${selected ? 'selected' : ''}`}
                      data-comment={`uns-row-${order.id}`}
                      onClick={event => {
                        if (
                          (event.target as HTMLElement).closest(
                            'button,input,textarea,a,label,[data-pop-anchor],.chk,.switch'
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
                          onChange={() => toggleOrderSelect(order.id)}
                        />
                      </td>
                      <td data-comment={`uns-expcell-${order.id}`}>
                        <button
                          aria-label='Toggle details'
                          className={`expander ${expanded ? 'open' : ''}`}
                          data-comment={`uns-exp-${order.id}`}
                          onClick={() => toggleExpand(order.id)}
                        >
                          <ChevronRight style={{ width: '14px', height: '14px' }} />
                        </button>
                      </td>
                      <td className='cell-num muted' data-comment={`uns-entry-${order.id}`}>
                        {fmtDate(order.entryDate)}
                      </td>
                      <td className='cell-num muted' data-comment={`uns-ship-${order.id}`}>
                        {order.shipDate ? fmtDate(order.shipDate) : '—'}
                      </td>
                      <td className='cell-order' data-comment={`uns-order-${order.id}`}>
                        {order.order}
                        {order.isSplit ? (
                          <span className='split-badge' data-comment={`uns-split-${order.id}`}>
                            Split
                          </span>
                        ) : null}
                      </td>
                      <td className='cell-cust' data-comment={`uns-cust-${order.id}`}>
                        {order.customer}
                      </td>
                      <td className='trunc muted' data-comment={`uns-addr-${order.id}`}>
                        {order.address || '—'}
                      </td>
                      <td className='trunc muted' data-comment={`uns-city-${order.id}`}>
                        {order.city || '—'}
                      </td>
                      <td className='mono trunc' data-comment={`uns-gc-${order.id}`}>
                        {gaugeColourLabel(order, unscheduledLineItemsOf(order))}
                      </td>
                      <td className='mono muted' data-comment={`uns-po-${order.id}`}>
                        {order.po || '—'}
                      </td>
                      <td className='muted' data-comment={`uns-sales-${order.id}`}>
                        {order.salesman || '—'}
                      </td>
                      <td className='muted' data-comment={`uns-via-${order.id}`}>
                        {order.shipVia || '—'}
                      </td>
                      <td data-comment={`uns-pri-${order.id}`}>
                        <PriorityCell order={order} />
                      </td>
                      <td data-comment={`uns-note-${order.id}`}>
                        <NoteButton order={order} />
                      </td>
                    </tr>
                    {expanded ? (
                      <LineItemsSubrow order={order} ctx='uns' colSpan={COLUMNS} />
                    ) : null}
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
