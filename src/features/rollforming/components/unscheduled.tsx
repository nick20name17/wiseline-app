import { CalendarDays, ChevronRight, Plus } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import { fmtDate } from '../format'
import {
  gaugeColourLabel,
  orderInGroup,
  orderMatchesSearch,
  unscheduledLineItemsOf,
  unscheduledOrders
} from '../selectors'
import { rollformingStore, toggleExpand, toggleOrderSelect } from '../store'
import { openMaterialRequest, openSchedule, showToast } from '../ui'
import { EmptyState, GroupTabs, NoteButton, PriorityCell } from './bits'
import { LineItemsSubrow } from './line-items'

const COLUMNS = 14

/** N-166 */
const DATA_COLUMNS: Column[] = [
  { key: 'entry', label: 'Entry', width: '76px' },
  { key: 'ship', label: 'Ship', width: '76px' },
  { key: 'order', label: 'Order #', width: '106px' },
  { key: 'customer', label: 'Customer' },
  { key: 'address', label: 'Address', width: '150px' },
  { key: 'city', label: 'City', width: '110px' },
  { key: 'gc', label: 'Gauge / Colour', width: '150px' },
  { key: 'po', label: 'PO', width: '96px' },
  { key: 'salesman', label: 'Salesman', width: '104px' },
  { key: 'via', label: 'Ship Via', width: '120px' },
  { key: 'priority', label: 'Priority', width: '130px' },
  { key: 'notes', label: 'Notes', width: '62px' }
]

export const Unscheduled = () => {
  const state = useStore(rollformingStore, current => current)
  const { headers, cells } = useColumnOrder('rf-uns', DATA_COLUMNS, { notify: showToast })
  const rows = unscheduledOrders(state.orders)
    .filter(order => orderMatchesSearch(order, state.searchTerm))
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
        <button className='btn' data-comment='uns-mreq' onClick={openMaterialRequest}>
          <Plus style={{ width: '14px', height: '14px' }} />
          New Material Request
        </button>
        <button
          className='btn btn-primary'
          data-comment='uns-schedule'
          disabled={!selectedCount}
          onClick={() =>
            openSchedule({
              mode: 'entire',
              orderIds: state.selectedOrderIds.filter(id => rows.some(order => order.id === id))
            })
          }
        >
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
                {headers}
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
                            className='cell-num muted'
                            data-comment={`uns-ship-${order.id}`}
                          >
                            {order.shipDate ? fmtDate(order.shipDate) : '—'}
                          </td>
                        ),
                        order: (
                          <td
                            data-col='order'
                            className='cell-order'
                            data-comment={`uns-order-${order.id}`}
                          >
                            {order.order}
                            {order.isSplit ? (
                              <span className='split-badge' data-comment={`uns-split-${order.id}`}>
                                Split
                              </span>
                            ) : null}
                          </td>
                        ),
                        customer: (
                          <td
                            data-col='customer'
                            className='cell-cust'
                            data-comment={`uns-cust-${order.id}`}
                          >
                            {order.customer}
                          </td>
                        ),
                        address: (
                          <td
                            data-col='address'
                            className='trunc muted'
                            data-comment={`uns-addr-${order.id}`}
                          >
                            {order.address || '—'}
                          </td>
                        ),
                        city: (
                          <td
                            data-col='city'
                            className='trunc muted'
                            data-comment={`uns-city-${order.id}`}
                          >
                            {order.city || '—'}
                          </td>
                        ),
                        gc: (
                          <td
                            data-col='gc'
                            className='mono trunc'
                            data-comment={`uns-gc-${order.id}`}
                          >
                            {gaugeColourLabel(order, unscheduledLineItemsOf(order))}
                          </td>
                        ),
                        po: (
                          <td
                            data-col='po'
                            className='mono muted'
                            data-comment={`uns-po-${order.id}`}
                          >
                            {order.po || '—'}
                          </td>
                        ),
                        salesman: (
                          <td
                            data-col='salesman'
                            className='muted'
                            data-comment={`uns-sales-${order.id}`}
                          >
                            {order.salesman || '—'}
                          </td>
                        ),
                        via: (
                          <td data-col='via' className='muted' data-comment={`uns-via-${order.id}`}>
                            {order.shipVia || '—'}
                          </td>
                        ),
                        priority: (
                          <td data-col='priority' data-comment={`uns-pri-${order.id}`}>
                            <PriorityCell order={order} />
                          </td>
                        ),
                        notes: (
                          <td data-col='notes' data-comment={`uns-note-${order.id}`}>
                            <NoteButton order={order} />
                          </td>
                        )
                      })}
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
