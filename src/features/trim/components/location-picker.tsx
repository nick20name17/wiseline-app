import { useState } from 'react'
import { Timer } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import {
  isLocationFull,
  isLocationLockedForOrder,
  isLocationOverWeight,
  isMultiLocation,
  LOC_SCHEMES,
  locCurrentWeight,
  locOccupantCount
} from '../selectors'
import { trimStore } from '../store'

const DEPTS = ['Trim', 'Rollforming', 'Accessories']

/**
 * The warehouse floor as a grid of cells, one column per kind of location.
 *
 * A cell is coloured by what it would mean to put *this* order there, not by what it holds: the
 * order's own current cell reads `mine`, its earlier ones read `locked` (finished — do not add more
 * packages), and a cell that the package staged right now would push over its weight reads `over`
 * before anything is placed. That prediction is the point — a worker finds out at the grid rather
 * than at the printer.
 */
export const LocationPicker = ({
  orderId,
  stagedWeight,
  onClose,
  onPick
}: {
  orderId: number | null
  stagedWeight: number
  onClose: () => void
  onPick: (locationId: number) => void
}) => {
  const [dept, setDept] = useState('Trim')
  const { orders, locations } = useStore(trimStore, state => state)

  const order = orderId == null ? null : orders.find(candidate => candidate.id === orderId)
  const columns = LOC_SCHEMES[dept] ?? LOC_SCHEMES.Trim!

  return (
    <Overlay id='overlay-locpicker' comment='overlay-locpicker' open={!!order} onClose={onClose}>
      <div
        className='modal wide'
        data-comment='locpicker-modal'
        data-component='dialog'
        style={{ display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}
      >
        <ModalHead
          comment='locpicker-head'
          titleComment='locpicker-title'
          descComment='locpicker-desc'
          title={`Select location${order ? ` · Order ${order.order}` : ''}`}
          desc='Defaults to Trim locations — click an available cell to assign it. Multi-Order cells show an order count (e.g. 2/4) and accept several orders up to their cap or Max Weight; greyed cells are full or single-order and in use. Adding a 2nd location oranges the earlier one.'
          onClose={onClose}
        />

        <div
          className='modal-body'
          id='locpicker-body'
          data-comment='locpicker-body'
          style={{ flex: 1, overflow: 'auto' }}
        >
          {/* #204: no warehouse tabs — location codes are globally unique, so which warehouse a
              cell sits in tells the worker nothing they need. */}
          <div className='loc-depttabs' data-comment='loc-depttabs'>
            {DEPTS.map(name => (
              <button
                className={`loc-tab sub ${name === dept ? 'active' : ''}`}
                data-comment={`loc-depttab-${name}`}
                onClick={() => setDept(name)}
                key={name}
              >
                {name}
              </button>
            ))}
            <div className='toolbar-spacer' />
            <span className='muted mono' style={{ fontSize: '11px' }} data-comment='loc-pageinfo'>
              Defaults to Trim
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
                      location.dept === dept &&
                      location.code[0] === column.prefix
                  )
                  .map(location => {
                    const mine = (order?.locationIds ?? []).includes(location.id)
                    const full = isLocationFull(location)
                    const predictOver =
                      stagedWeight > 0 &&
                      locCurrentWeight(location) + stagedWeight > (location.maxWeight as number)
                    const over = isLocationOverWeight(location) || predictOver
                    const multi = isMultiLocation(location)

                    const cls = mine
                      ? over
                        ? 'over'
                        : order && isLocationLockedForOrder(order, location.id)
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
                        onClick={() => onPick(location.id)}
                        title={`${location.code} · ${locCurrentWeight(location).toFixed(0)}/${location.maxWeight} lb · ${locOccupantCount(location)}/${(location.maxOrders as number) || 1}${multi ? ' orders (Multi-Order)' : ' order'}`}
                        key={location.id}
                      >
                        {location.code}
                        {multi ? (
                          <span
                            className='loc-cell-occ'
                            data-comment={`loccell-${location.id}-occ`}
                          >
                            {locOccupantCount(location)}/{location.maxOrders as number}
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
