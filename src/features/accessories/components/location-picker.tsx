import { useState } from 'react'
import { Timer } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { locCurrentWeight, stagedWeight } from '../selectors'
import { accessoriesStore, assignLocation } from '../store'
import { requestRemoveLocation, showToast } from '../ui'

import type { Location } from '../types'

/** The columns of each department's grid: a code's first character says what kind of cell it is. */
const LOC_SCHEMES: Record<string, { prefix: string; label: string }[]> = {
  Trim: [
    { prefix: '1', label: '1 of 1' },
    { prefix: '2', label: 'Wooden' },
    { prefix: '3', label: 'Small' },
    { prefix: '4', label: 'Medium' },
    { prefix: '5', label: 'Large' },
    { prefix: '6', label: 'Long' }
  ],
  Rollforming: [
    { prefix: 'A', label: 'Rack' },
    { prefix: 'B', label: 'Cart' },
    { prefix: 'C', label: 'Lumber' },
    { prefix: 'D', label: 'Lumber' },
    { prefix: 'E', label: 'Long' }
  ],
  Accessories: [
    { prefix: 'F', label: 'Rack' },
    { prefix: 'G', label: 'Cart' },
    { prefix: 'H', label: 'Lumber' },
    { prefix: 'I', label: 'Lumber' },
    { prefix: 'J', label: 'Long' }
  ]
}

const WAREHOUSES = [1, 2, 3]
const DEPARTMENTS = ['Trim', 'Rollforming', 'Accessories']

const occupantCount = (location: Location) => location.occupants.length
const isMulti = (location: Location) => (location.maxOrders || 1) > 1

/**
 * A Multi-Order location stays open until it hits its order cap *or* its weight cap; a single-order one
 * is full the moment anything is in it.
 */
const isFull = (location: Location) =>
  isMulti(location)
    ? occupantCount(location) >= (location.maxOrders || 1) ||
      locCurrentWeight(location) >= location.maxWeight
    : occupantCount(location) >= 1

/**
 * The shared warehouse grid, opened from the package builder.
 *
 * Orange is predictive as much as actual: a cell reads over when the package *being built* would push it
 * past its Max Weight, which is while the operator can still pick another one. A cell already this
 * order's is clickable to give it back; a cell that is full is blocked rather than merely greyed.
 */
export const LocationPicker = ({
  orderId,
  onClose
}: {
  orderId: number | null
  onClose: () => void
}) => {
  const orders = useStore(accessoriesStore, state => state.orders)
  const locations = useStore(accessoriesStore, state => state.locations)
  const [warehouse, setWarehouse] = useState(1)
  const [department, setDepartment] = useState('Accessories')

  const order = orders.find(entry => entry.id === orderId)
  const staged = order ? stagedWeight(order) : 0
  const held = order?.locationIds ?? []
  const columns = LOC_SCHEMES[department] ?? LOC_SCHEMES.Accessories ?? []

  const pick = (location: Location) => {
    if (!order) return

    if (held.includes(location.id)) {
      requestRemoveLocation(order.id, location.id)
      return
    }
    // enforced, not just greyed: a full cell cannot be taken
    if (isFull(location)) return

    assignLocation(order.id, location.id)
    showToast(`Location ${location.code} assigned`)
  }

  return (
    <Overlay id='overlay-locpicker' comment='overlay-locpicker' open={!!order} onClose={onClose}>
      <div className='modal wide' data-comment='locpicker-modal' data-component='dialog'>
        <ModalHead
          comment='locpicker-head'
          titleComment='locpicker-title'
          descComment='locpicker-desc'
          title={`Select location · Order ${order?.orderNumber ?? ''}`}
          desc='Defaults to Accessories locations for this warehouse — click an available cell to assign it. Multi-Order locations (shown with an order count, e.g. 2/4) accept several orders up to their order cap or Max Weight; greyed cells are full or single-order and already in use.'
          onClose={onClose}
        />
        <div className='modal-body' id='locpicker-body' data-comment='locpicker-body'>
          <div className='loc-whtabs' data-comment='loc-whtabs'>
            {WAREHOUSES.map(wh => (
              <button
                className={`loc-tab ${wh === warehouse ? 'active' : ''}`}
                data-comment={`loc-whtab-${wh}`}
                onClick={() => setWarehouse(wh)}
                key={wh}
              >
                Warehouse #{wh}
              </button>
            ))}
          </div>
          <div className='loc-depttabs' data-comment='loc-depttabs'>
            {DEPARTMENTS.map(dept => (
              <button
                className={`loc-tab sub ${dept === department ? 'active' : ''}`}
                data-comment={`loc-depttab-${dept}`}
                onClick={() => setDepartment(dept)}
                key={dept}
              >
                {dept}
              </button>
            ))}
            <div className='toolbar-spacer' />
            <span className='muted mono' style={{ fontSize: '11px' }} data-comment='loc-pageinfo'>
              Page 1 of 1
            </span>
          </div>
          <div className='locgrid' data-comment='locgrid'>
            {columns.map(column => (
              <div
                className='locgrid-col'
                data-comment={`locgrid-col-${column.prefix}`}
                key={column.prefix}
              >
                <div className='locgrid-colhead' data-comment={`locgrid-colhead-${column.prefix}`}>
                  {column.label}
                </div>
                {locations
                  .filter(
                    location =>
                      location.wh === warehouse &&
                      location.dept === department &&
                      location.code[0] === column.prefix
                  )
                  .map(location => {
                    const mine = held.includes(location.id)
                    const full = isFull(location)
                    const predictOver =
                      staged > 0 && locCurrentWeight(location) + staged > location.maxWeight
                    const over = locCurrentWeight(location) > location.maxWeight || predictOver
                    const locked = mine && held.indexOf(location.id) !== held.length - 1

                    const cls = mine
                      ? over
                        ? 'over'
                        : locked
                          ? 'locked'
                          : 'mine'
                      : full
                        ? 'taken'
                        : predictOver
                          ? 'over'
                          : ''

                    return (
                      <button
                        className={`loc-cell ${cls}`}
                        data-comment={`loccell-${location.id}`}
                        disabled={!mine && full}
                        onClick={() => pick(location)}
                        title={`${location.code} · ${locCurrentWeight(location).toFixed(0)}/${location.maxWeight} lb · ${occupantCount(location)}/${location.maxOrders || 1}${isMulti(location) ? ' orders (Multi-Order)' : ' order'}`}
                        key={location.id}
                      >
                        {location.code}
                        {isMulti(location) ? (
                          <span
                            className='loc-cell-occ'
                            data-comment={`loccell-${location.id}-occ`}
                          >
                            {occupantCount(location)}/{location.maxOrders}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
              </div>
            ))}
          </div>
        </div>
        <div className='loc-foot' id='locpicker-foot' data-comment='locpicker-foot'>
          <div className='release-note' data-comment='locpicker-release-note'>
            <Timer style={{ width: '14px', height: '14px', flex: 'none', marginTop: '1px' }} />
            <div className='release-note-body' data-comment='locpicker-release-body'>
              <div data-comment='locpicker-release-text'>
                A location also frees on its own — automatically about <b>15 min</b> after Shipping
                scans the last package for this order onto a truck.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  )
}
