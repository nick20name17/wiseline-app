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
  locOccupantCount,
  pkgWeightOf
} from '../selectors'
import { assignPackageToLocation, removePackageLocation, rollformingStore } from '../store'
import { askAlert, askConfirm, closeConfirm } from '../ui'

/** Which package is being placed. One package, one location — an order can end up spread over several. */
export type LocCtx = { orderId: number; seq: number }

const WAREHOUSES = [1, 2, 3]
const DEPTS = ['Trim', 'Rollforming', 'Accessories']

export const LocationPicker = ({ ctx, onClose }: { ctx: LocCtx | null; onClose: () => void }) => {
  const [warehouse, setWarehouse] = useState(1)
  const [dept, setDept] = useState('Rollforming')
  const { orders, locations } = useStore(rollformingStore, state => state)

  const order = orders.find(candidate => candidate.id === ctx?.orderId)
  const pkg = order?.packages.find(candidate => candidate.seq === ctx?.seq)
  const addWeight = order && pkg ? pkgWeightOf(order, pkg) : 0
  const columns = LOC_SCHEMES[dept] ?? LOC_SCHEMES.Rollforming!

  /**
   * N-087: an order that has packages must keep at least one location, so the last one cannot be
   * taken away — there would be nowhere for the pieces to be.
   */
  const pick = (locationId: number) => {
    if (!order || !pkg) return
    const location = locations.find(candidate => candidate.id === locationId)
    if (!location) return

    if (pkg.locId === locationId) {
      const occupied = [
        ...new Set(
          order.packages
            .filter(entry => !entry.deleted && entry.locId != null)
            .map(entry => entry.locId)
        )
      ]
      if (occupied.length <= 1 && order.packages.some(entry => !entry.deleted))
        return askAlert(
          'Location required',
          'An order with existing packages needs to have at least 1 location, please select a location to continue.'
        )

      return askConfirm(
        'Remove location',
        'Are you sure you want to remove this location from this order?',
        () => {
          closeConfirm()
          removePackageLocation(order.id, pkg.seq, locationId)
        }
      )
    }

    const mine = (location.occupants ?? []).some(occupant => occupant.orderId === order.id)
    if (!mine && isLocationFull(location)) return

    if (locCurrentWeight(location) + addWeight > location.maxWeight)
      return askConfirm(
        'Location over weight limit',
        `${location.code} would exceed ${location.maxWeight} lb (soft limit). Assign anyway?`,
        () => {
          closeConfirm()
          assignPackageToLocation(order.id, pkg.seq, locationId)
        }
      )

    assignPackageToLocation(order.id, pkg.seq, locationId)
  }

  return (
    <Overlay id='overlay-loc' comment='overlay-loc' open={!!order && !!pkg} onClose={onClose}>
      <div className='modal wide' data-comment='loc-modal' data-component='dialog'>
        <ModalHead
          comment='loc-head'
          titleComment='loc-title'
          descComment='loc-desc'
          title='Select Location'
          desc={
            pkg
              ? `Location for package ${pkg.barcode} — defaults to Rollforming, but you may pick another department.`
              : 'Defaults to Rollforming locations for this warehouse — click an available cell. Multi-Order cells (with an order count, e.g. 2/4) hold several orders up to their order cap or Max Weight; greyed cells are full, orange is an earlier location for this order, red would exceed Max Weight.'
          }
          onClose={onClose}
        />
        <div className='modal-body' id='loc-body' data-comment='loc-body'>
          <div className='loc-whtabs' data-comment='loc-whtabs'>
            {WAREHOUSES.map(id => (
              <button
                className={`loc-tab ${id === warehouse ? 'active' : ''}`}
                data-comment={`loc-whtab-${id}`}
                onClick={() => setWarehouse(id)}
                key={id}
              >
                Warehouse #{id}
              </button>
            ))}
          </div>
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
                      location.dept === dept &&
                      location.code[0] === column.prefix
                  )
                  .map(location => {
                    const mine =
                      pkg?.locId === location.id ||
                      (location.occupants ?? []).some(occupant => occupant.orderId === order?.id)
                    const full = isLocationFull(location)
                    const multi = isMultiLocation(location)
                    // what *this* package would do to the cell, before it is placed there
                    const wouldOver =
                      locCurrentWeight(location) + (pkg?.locId === location.id ? 0 : addWeight) >
                      location.maxWeight

                    const cls = mine
                      ? order && isLocationLockedForOrder(order.id, location.id, locations)
                        ? 'locked'
                        : wouldOver || isLocationOverWeight(location)
                          ? 'over'
                          : 'mine'
                      : full
                        ? 'taken'
                        : wouldOver
                          ? 'over'
                          : ''

                    return (
                      <button
                        className={`loc-cell ${cls}`}
                        data-comment={`loccell-${location.id}`}
                        disabled={!mine && full}
                        key={location.id}
                        title={`${location.code} · ${locCurrentWeight(location).toFixed(0)}/${
                          location.maxWeight
                        } lb · ${locOccupantCount(location)}/${location.maxOrders || 1}${
                          multi ? ' orders (Multi-Order)' : ' order'
                        }`}
                        onClick={() => pick(location.id)}
                      >
                        {location.code}
                        {multi ? (
                          <span
                            className='loc-cell-occ'
                            data-comment={`loccell-${location.id}-occ`}
                          >
                            {locOccupantCount(location)}/{location.maxOrders}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
              </div>
            ))}
          </div>
        </div>
        <div className='loc-foot' id='loc-foot' data-comment='loc-foot'>
          <div className='release-note' data-comment='loc-release-note'>
            <Timer style={{ width: '14px', height: '14px', flex: 'none', marginTop: '1px' }} />
            <div className='release-note-body' data-comment='loc-release-body'>
              <div data-comment='loc-release-text'>
                A location also frees on its own — automatically about <b>15 min</b> after Shipping
                scans this order’s last package onto a truck.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  )
}
