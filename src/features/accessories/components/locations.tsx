import {
  AUTO_RELEASE_MS,
  effectiveScanTs,
  fmtCountdown,
  isLocationLockedForOrder,
  isLocationOverWeight,
  locById,
  locCurrentWeight,
  stagedWeight
} from '../selectors'
import { useNow } from '../use-now'

import type { Order } from '../types'

/**
 * The location chips an order holds, each with its own release countdown.
 *
 * "Held until shipped" is not a fallback — a location is kept indefinitely until Shipping scans the
 * order's last package, and only then does the 15 minutes start. The orange state is predictive as
 * well as actual: a location also reads over when the package *being built* would push it past its
 * Max Weight, which is the moment the operator can still choose another one.
 */
export const LocTags = ({ order }: { order: Order }) => {
  const now = useNow()
  const ids = order.locationIds ?? []
  if (!ids.length)
    return (
      <span className='subtle' style={{ fontSize: '11.5px' }}>
        No location assigned
      </span>
    )

  const staged = stagedWeight(order)

  return (
    <>
      {ids.map(id => {
        const location = locById(id)
        if (!location) return null

        const locked = isLocationLockedForOrder(order, id)
        const predictOver =
          !locked && staged > 0 && locCurrentWeight(location) + staged > location.maxWeight
        const cls = isLocationOverWeight(location) || predictOver ? 'over' : locked ? 'locked' : ''
        const hint = locked
          ? 'Locked — full, do not add more packages here'
          : predictOver
            ? 'This package would push the location over Max Weight — choose another'
            : 'Click to remove this location'

        const occupied = location.occupants.some(occupant => occupant.orderId === order.id)
        const lastScan = occupied ? effectiveScanTs(order, now) : null
        const msLeft = lastScan === null ? null : AUTO_RELEASE_MS - (now - lastScan)
        const countdown =
          lastScan === null
            ? 'held until shipped'
            : msLeft !== null && msLeft <= 0
              ? 'releasing…'
              : `auto-release ${fmtCountdown(msLeft as number)}`

        return (
          <span className='loc-tag-wrap' data-comment={`loctagwrap-${order.id}-${id}`} key={id}>
            <button
              className={`loc-tag ${cls}`}
              data-comment={`loctag-${order.id}-${id}`}
              title={hint}
            >
              {location.code}
            </button>
            <span
              className={`countdown${msLeft !== null && msLeft <= 0 ? ' is-due' : ''}`}
              data-comment={`loctag-${order.id}-${id}-countdown`}
            >
              {countdown}
            </span>
          </span>
        )
      })}
    </>
  )
}
