import { Check, ChevronRight, MapPin, Package, Printer, Wand2, X } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import {
  isOverdue,
  scheduledLineItemsOf,
  sortedActive,
  stagedWeight,
  truckDisplay
} from '../selectors'
import {
  accessoriesStore,
  autoFillLine,
  clearPackaging,
  setMaxPkgWeight,
  setPackaging,
  toggleExpand
} from '../store'
import { createAndPrint, openLocationPicker, openPackages, requestOrderComplete } from '../ui'
import {
  DateSepRow,
  DetailField,
  EmptyState,
  ItemStatusPill,
  LineNoteButton,
  OrderNoteButton,
  OrderStatusPill,
  PriorityCell,
  ShipViaCell
} from './bits'
import { LocTags } from './locations'

import type { LineItem, Order } from '../types'

const OVERDUE_BADGE_STYLE = {
  color: 'var(--danger)',
  background: 'var(--danger-soft)',
  borderColor: 'var(--danger)'
}

/**
 * A fully packaged line loses its input entirely: Fill greys out and says why.
 *
 * `lucide-wand-2` is written on by hand because lucide renamed this icon to `wand-sparkles` after the
 * prototype pinned its CDN copy. Same glyph, different class — and the class is what the structural
 * diff compares, so the port states the prototype's name rather than letting the rename read as a
 * missing icon.
 */
const PackagingCell = ({ item, orderId }: { item: LineItem; orderId: number }) => {
  if (item.leftToPackage === 0)
    return (
      <div className='pack-cell' data-comment={`packcell-${item.id}`}>
        <button
          className='btn btn-sm'
          style={{ gap: '5px' }}
          disabled
          data-comment={`autofill-${item.id}`}
          title='Fully packaged — nothing left to package'
        >
          <Wand2 className='lucide-wand-2' style={{ width: '14px', height: '14px' }} />
          Fill
        </button>
        <span className='packaged-tag' data-comment={`packaged-${item.id}`}>
          <Check style={{ width: '12px', height: '12px' }} />
          Packaged
        </span>
      </div>
    )

  const filled = item.packaging > 0

  return (
    <div className='pack-cell' data-comment={`packcell-${item.id}`}>
      <input
        className='field-input pack-input'
        type='number'
        min={0}
        max={item.leftToPackage}
        value={item.packaging || ''}
        placeholder='0'
        data-comment={`packinput-${item.id}`}
        onChange={event => setPackaging(orderId, item.id, event.target.value)}
      />
      <button
        className='btn btn-sm'
        style={{ gap: '5px' }}
        data-comment={`autofill-${item.id}`}
        title={filled ? 'Clear packaging' : 'Auto fill — package all remaining'}
        onClick={() =>
          filled ? clearPackaging(orderId, item.id) : autoFillLine(orderId, item.id)
        }
      >
        {filled ? (
          <X style={{ width: '14px', height: '14px' }} />
        ) : (
          <Wand2 className='lucide-wand-2' style={{ width: '14px', height: '14px' }} />
        )}
        {filled ? 'Clear' : 'Fill'}
      </button>
    </div>
  )
}

/**
 * The package builder, and the three gates it walks: a quantity opens Select location, a location
 * opens Create & print, and one printed package opens Order complete.
 */
const Subrow = ({ order }: { order: Order }) => {
  const draftWeight = stagedWeight(order)
  // 0 is not "no packages over the limit" but "no limit at all"
  const overPkg = order.maxPkgWeight > 0 && draftWeight > order.maxPkgWeight
  const canSelectLoc = order.items.some(item => item.packaging > 0)
  const hasLoc = (order.locationIds ?? []).length > 0
  const canCreate = canSelectLoc && hasLoc && draftWeight > 0
  const livePackages = order.packages.filter(pkg => !pkg.deleted)

  return (
    <tr className='subrow' data-comment={`pkg-subrow-${order.id}`}>
      <td colSpan={9}>
        <div className='subwrap' data-comment={`pkg-subwrap-${order.id}`}>
          <div className='detail-bar' data-comment={`detail-bar-${order.id}`}>
            <div className='detail-col' data-comment={`detail-col1-${order.id}`}>
              <DetailField
                label='Customer'
                value={order.customer}
                commentKey={`detail-cust-${order.id}`}
              />
              <DetailField
                label='Order #'
                value={order.orderNumber}
                commentKey={`detail-ono-${order.id}`}
              />
              <DetailField
                label='PO #'
                value={order.po || '—'}
                commentKey={`detail-po-${order.id}`}
              />
              <DetailField
                label='Salesman'
                value={order.salesman || '—'}
                commentKey={`detail-sales-${order.id}`}
              />
            </div>
            <div className='detail-col' data-comment={`detail-col2-${order.id}`}>
              <DetailField
                label='Ship Via'
                value={order.shipVia}
                commentKey={`detail-shipvia-${order.id}`}
              />
              <div className='detail-field' data-comment={`detail-fpri-${order.id}`}>
                <span className='detail-label'>Priority</span>
                <PriorityCell order={order} />
              </div>
              <div className='detail-field' data-comment={`detail-floc-${order.id}`}>
                <span className='detail-label'>Accessories Location</span>
                <div className='loc-tags' data-comment={`loc-tags-${order.id}`}>
                  <LocTags order={order} />
                </div>
              </div>
            </div>
          </div>

          <table className='sub' data-comment={`litable-${order.id}`}>
            <thead>
              <tr>
                <th style={{ width: '88px' }}>Qty Ordered</th>
                <th style={{ width: '100px' }}>Left To Pkg</th>
                <th style={{ width: '170px' }}>Packaging</th>
                <th style={{ width: '118px' }}>Status</th>
                <th style={{ width: '76px' }}>ID</th>
                <th>Description</th>
                <th style={{ width: '48px' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {scheduledLineItemsOf(order).map(item => (
                <tr data-comment={`li-${item.id}`} key={item.id}>
                  <td className='cell-num' data-comment={`li-qty-${item.id}`}>
                    {item.qtyOrdered}
                  </td>
                  <td className='cell-num' data-comment={`li-left-${item.id}`}>
                    {item.leftToPackage}
                  </td>
                  <td data-comment={`li-packaging-${item.id}`}>
                    <PackagingCell item={item} orderId={order.id} />
                  </td>
                  <td data-comment={`li-status-${item.id}`}>
                    <ItemStatusPill item={item} />
                  </td>
                  <td className='mono' data-comment={`li-pid-${item.id}`}>
                    {item.productId}
                  </td>
                  <td className='trunc' data-comment={`li-desc-${item.id}`}>
                    {item.description}
                  </td>
                  <td data-comment={`li-notes-${item.id}`}>
                    <LineNoteButton item={item} orderId={order.id} commentKey={`li-notebtn-${item.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className='pkgbuilder' data-comment={`pkgbuilder-${order.id}`}>
            <div
              className={`weight-box${overPkg ? ' over' : ''}`}
              data-comment={`weightbox-${order.id}`}
            >
              <span className='weight-box-label' data-comment={`weightbox-label-${order.id}`}>
                Package weight
              </span>
              <span className='weight-box-val mono' data-comment={`weightbox-val-${order.id}`}>
                {draftWeight.toFixed(2)} lb
              </span>
            </div>
            <label className='maxw-field' data-comment={`maxw-field-${order.id}`}>
              <span data-comment={`maxw-label-${order.id}`}>Max weight/pkg</span>
              <input
                className='field-input'
                type='number'
                min={1}
                step={0.5}
                value={order.maxPkgWeight}
                placeholder='15'
                data-comment={`maxw-input-${order.id}`}
                onChange={event => setMaxPkgWeight(order.id, event.target.value)}
              />
              <span data-comment={`maxw-unit-${order.id}`} className='muted'>
                lb
              </span>
            </label>
            <div className='toolbar-spacer' />
            <button
              className='btn'
              data-comment={`selectloc-${order.id}`}
              disabled={!canSelectLoc}
              onClick={() => openLocationPicker(order.id)}
            >
              <MapPin style={{ width: '14px', height: '14px' }} />
              Select location
            </button>
            <button
              className='btn btn-primary'
              data-comment={`createprint-${order.id}`}
              disabled={!canCreate}
              onClick={() => createAndPrint(order.id)}
            >
              <Printer style={{ width: '14px', height: '14px' }} />
              Create &amp; print
            </button>
            {livePackages.length ? (
              <button
                className='btn'
                data-comment={`seepkg-${order.id}`}
                onClick={() => openPackages(order.id)}
              >
                <Package style={{ width: '14px', height: '14px' }} />
                See packages ({livePackages.length})
              </button>
            ) : null}
            <button
              className='btn btn-primary'
              data-comment={`ordercomplete-${order.id}`}
              disabled={!livePackages.length}
              onClick={() => requestOrderComplete(order.id)}
            >
              Order complete
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

/** The worker's flat list, sorted by Prep Date and broken by day. */
export const Packaging = () => {
  const state = useStore(accessoriesStore, current => current)
  const expandedIds = state.expandedIds

  const rows = sortedActive(state)
  const overdueCount = rows.filter(isOverdue).length

  return (
    <>
      <div className='toolbar' data-comment='pkg-toolbar'>
        <span className='toolbar-info' data-comment='pkg-count'>
          <b>{rows.length}</b> order{rows.length !== 1 ? 's' : ''} to package
          {overdueCount ? (
            <>
              {' · '}
              <b style={{ color: 'var(--danger)' }}>{overdueCount}</b> overdue
            </>
          ) : null}
        </span>
      </div>

      {!rows.length ? (
        <EmptyState
          title='Nothing to package'
          text='Accessories orders scheduled for packaging land here, sorted by Prep Date.'
        />
      ) : (
        <div className='table-wrap' data-comment='pkg-wrap'>
          <table className='grid' data-comment='pkg-table'>
            <thead>
              <tr>
                <th style={{ width: '30px' }} />
                <th style={{ width: '180px' }}>Prep Date</th>
                <th style={{ width: '170px' }}>Order #</th>
                <th style={{ width: '150px' }}>Priority</th>
                <th>Customer</th>
                <th style={{ width: '110px' }}>Truck</th>
                <th style={{ width: '110px' }}>Ship Via</th>
                <th style={{ width: '132px' }}>Status</th>
                <th style={{ width: '64px' }}>Notes</th>
              </tr>
            </thead>
            <tbody data-comment='pkg-tbody'>
              {rows.map((order, index) => {
                const overdue = isOverdue(order)
                const expanded = expandedIds.includes(order.id)
                const startsDay = order.prepDate !== rows[index - 1]?.prepDate
                const sameDay = rows.filter(row => row.prepDate === order.prepDate)
                const dayOverdue = sameDay.filter(isOverdue).length

                return (
                  <Fragment key={order.id}>
                    {startsDay ? (
                      <DateSepRow
                        iso={order.prepDate as string}
                        colSpan={9}
                        right={
                          <span
                            className='date-sep-meta'
                            data-comment={`datesep-meta-${order.prepDate}`}
                          >
                            {dayOverdue ? (
                              <span
                                className='date-sep-overdue'
                                data-comment={`datesep-overdue-${order.prepDate}`}
                              >
                                {dayOverdue} overdue
                              </span>
                            ) : null}
                            <span
                              className='date-sep-count'
                              data-comment={`datesep-count-${order.prepDate}`}
                            >
                              {sameDay.length} order{sameDay.length === 1 ? '' : 's'}
                            </span>
                          </span>
                        }
                      />
                    ) : null}

                    <tr
                      className={`row-order${overdue ? ' overdue' : ''}`}
                      data-comment={`pkg-row-${order.id}`}
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
                      <td>
                        <button
                          aria-label='Toggle details'
                          className={`expander${expanded ? ' open' : ''}`}
                          data-comment={`pkg-exp-${order.id}`}
                          onClick={() => toggleExpand(order.id)}
                        >
                          <ChevronRight style={{ width: '14px', height: '14px' }} />
                        </button>
                      </td>
                      <td className='cell-num muted' data-comment={`pkg-prepdate-${order.id}`}>
                        {fmtDate(order.prepDate)}
                      </td>
                      <td className='cell-order' data-comment={`pkg-ono-${order.id}`}>
                        {order.orderNumber}
                        {overdue ? (
                          <>
                            {' '}
                            <span
                              className='split-badge'
                              style={OVERDUE_BADGE_STYLE}
                              data-comment={`pkg-overduebadge-${order.id}`}
                            >
                              Overdue
                            </span>
                          </>
                        ) : null}
                      </td>
                      <td data-comment={`pkg-pricell-${order.id}`}>
                        <PriorityCell order={order} />
                      </td>
                      <td className='cell-cust trunc' data-comment={`pkg-cust-${order.id}`}>
                        {order.customer}
                      </td>
                      <td className='mono muted' data-comment={`pkg-truck-${order.id}`}>
                        {truckDisplay(order)}
                      </td>
                      <td data-comment={`pkg-shipvia-${order.id}`}>
                        <ShipViaCell order={order} />
                      </td>
                      <td data-comment={`pkg-status-${order.id}`}>
                        <OrderStatusPill order={order} />
                      </td>
                      <td data-comment={`pkg-notes-${order.id}`}>
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
