import { Box, Clock, Database, Package } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import {
  groupSlug,
  GROUPS,
  isOverdue,
  leftToPackage,
  productionOrdersFor,
  rollCoils,
  supplierName
} from '../selectors'
import { rollformingStore } from '../store'
import { EmptyState, GroupTabs, LineNoteButton, PriorityCell, StatusPill } from './bits'

import type { Order } from '../types'

/**
 * "Current Coil In The Rollformer" — the same panel on Production and on the Queue, which is why it
 * takes the `data-comment` prefix rather than owning one. A coil gets here by being checked into the
 * machine from the Queue; until then the panel says so rather than showing a blank.
 */
export const CoilPanel = ({ prefix }: { prefix: string }) => {
  // the panel is scoped to the machine tab, so the selector reads the group as well as the coil
  const current = useStore(rollformingStore, state => state.currentCoilByGroup[state.activeGroup])

  return (
    <div className='coil-panel' data-comment={`${prefix}-coilpanel`}>
      <Database style={{ width: '14px', height: '14px' }} />
      <span>Current Coil In The Rollformer:</span>
      {current ? (
        <span className='mono' data-comment={`${prefix}-coilinfo-set`}>
          {current.material} · {supplierName(current.supplierId)} ·{' '}
          {current.coilNumber || 'Undefined'}
        </span>
      ) : (
        <span className='subtle' data-comment={`${prefix}-coilinfo-empty`}>
          none checked in from the Queue yet
        </span>
      )}
    </div>
  )
}

/**
 * One order's run card.
 *
 * `index` only has to be unique across whatever is on screen, not sequential per machine — the
 * all-machines overview keeps one counter running across its sections, which is why it is passed in
 * rather than taken from the map.
 */
const ProductionRun = ({ order, index }: { order: Order; index: number }) => {
  const overdue = isOverdue(order.productionDate)
  const packageCount = (order.packages || []).length

  return (
    <div className='run' data-comment={`prod-run-${index}`}>
      <div
        className='run-head'
        data-comment={`prod-runhead-${index}`}
        style={overdue ? { background: 'var(--overdue-soft)' } : undefined}
      >
        <span className='cell-order' data-comment={`prod-ono-${index}`}>
          {order.order}
        </span>
        <span className='subtle' data-comment={`prod-cust-${index}`}>
          {order.customer}
        </span>
        {order.priorityId ? <PriorityCell order={order} readOnly /> : null}
        {overdue ? (
          <span
            className='split-badge'
            style={{
              color: 'var(--danger)',
              background: 'var(--danger-soft)',
              borderColor: 'var(--danger)'
            }}
            data-comment={`prod-overdue-${index}`}
          >
            Overdue
          </span>
        ) : null}
        <span className='toolbar-spacer' />
        {packageCount ? (
          <button className='btn btn-sm' data-comment={`prod-seepkg-${index}`}>
            <Package style={{ width: '14px', height: '14px' }} />
            See packages ({packageCount})
          </button>
        ) : null}
        <button className='btn btn-sm btn-primary' data-comment={`prod-createpkg-${index}`}>
          <Box style={{ width: '14px', height: '14px' }} />
          Create Package
        </button>
      </div>

      <table
        className='sub'
        data-comment={`prod-table-${index}`}
        style={{ border: 'none', borderRadius: 0 }}
      >
        <thead>
          <tr>
            <th>Profile</th>
            <th>Gauge / Colour</th>
            <th style={{ width: '70px' }}>Qty</th>
            <th style={{ width: '90px' }}>Left To Pkg</th>
            <th style={{ width: '150px' }}>Coil path</th>
            <th style={{ width: '116px' }}>Status</th>
            <th style={{ width: '48px' }} />
          </tr>
        </thead>
        <tbody>
          {order.lineItems.map((item, row) => {
            const roll = rollCoils(item)
            const waiting = roll.some(coil => coil.needsSlit && !coil.slitDone)
            const assigned = roll.length
              ? `${roll.filter(coil => coil.coilNumber).length}/${roll.length} assigned`
              : 'from stock'

            return (
              <tr key={item.id} data-comment={`prod-row-${index}-${row}`}>
                <td className='mono' data-comment={`prod-profile-${index}-${row}`}>
                  {item.profile}
                </td>
                <td className='trunc' data-comment={`prod-gc-${index}-${row}`}>
                  {item.gauge}ga {item.color}
                </td>
                <td className='mono' data-comment={`prod-qty-${index}-${row}`}>
                  {item.qty}
                </td>
                <td className='mono' data-comment={`prod-left-${index}-${row}`}>
                  {leftToPackage(order, item)}
                </td>
                <td data-comment={`prod-coilpath-${index}-${row}`}>
                  {waiting ? (
                    <span className='lock-tag' data-comment={`prod-waiting-${index}-${row}`}>
                      <Clock style={{ width: '14px', height: '14px' }} />
                      waiting...
                    </span>
                  ) : (
                    <span className='subtle' style={{ fontSize: '11px' }}>
                      {assigned}
                    </span>
                  )}
                </td>
                <td data-comment={`prod-st-${index}-${row}`}>
                  <StatusPill order={order} item={item} comment={`prod-stp-${index}-${row}`} />
                </td>
                <td data-comment={`prod-note-${index}-${row}`}>
                  <LineNoteButton item={item} comment={`prod-linote-${index}-${row}`} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export const Production = () => {
  const activeGroup = useStore(rollformingStore, state => state.activeGroup)
  // the runs read the orders, so the view has to re-render when any of them changes
  useStore(rollformingStore, state => state.orders)

  if (activeGroup === 'All') {
    const sections = GROUPS.map(group => ({ group, orders: productionOrdersFor(group) })).filter(
      section => section.orders.length
    )

    // one counter across every section: the same order can appear under two machines, and each card
    // it renders needs its own `data-comment`
    let index = 0

    return (
      <>
        <GroupTabs prefix='prod' />
        <CoilPanel prefix='prod' />
        {sections.length ? (
          sections.map(({ group, orders }) => (
            <Fragment key={group}>
              <div
                className='subhead-title'
                data-comment={`prod-allgroup-${groupSlug(group)}`}
                style={{ margin: '18px 2px 8px' }}
              >
                {group}
              </div>
              {orders.map(order => (
                <ProductionRun key={`${group}-${order.id}`} order={order} index={index++} />
              ))}
            </Fragment>
          ))
        ) : (
          <EmptyState
            title='Nothing in production'
            text='Released orders with packaging left to do will show here.'
          />
        )}
      </>
    )
  }

  const orders = productionOrdersFor(activeGroup)

  return (
    <>
      <GroupTabs prefix='prod' />
      <CoilPanel prefix='prod' />
      {orders.length ? (
        orders.map((order, index) => <ProductionRun key={order.id} order={order} index={index} />)
      ) : (
        <EmptyState
          title={`Nothing in production for ${activeGroup}`}
          text='Released orders with packaging left to do will show here.'
        />
      )}
    </>
  )
}
