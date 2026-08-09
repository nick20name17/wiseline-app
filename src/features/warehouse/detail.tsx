import { Timer, TriangleAlert, X } from 'lucide-react'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { useNow } from '@/features/accessories/use-now'

import {
  AUTO_RELEASE_MS,
  barColor,
  fmtCountdown,
  fmtN,
  isFull,
  isMulti,
  isOver,
  lastScanAt,
  occCurrent,
  occPct,
  orderCap,
  orderCount,
  removeOccupant,
  RELEASE_CHECK_MS,
  STATUS_CLASS,
  type Location
} from './store'

/**
 * One location, and what is standing in it.
 *
 * The countdown is the point of the screen: a location frees when the order is taken out of it, or on
 * its own fifteen minutes after Shipping's last scan, and both of those have to be visible from here
 * or the yard looks fuller than it is.
 */
export const LocationDetail = ({
  location,
  onClose
}: {
  location: Location | null
  onClose: () => void
}) => {
  const now = useNow(RELEASE_CHECK_MS)

  const current = location ? occCurrent(location) : 0
  const pct = location ? occPct(location) : 0
  const over = location ? isOver(location) : false

  return (
    <Overlay id='overlay-detail' comment='overlay-detail' open={!!location} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '540px' }}
        data-comment='detail-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='detail-head'
          titleComment='detail-title'
          descComment='detail-desc'
          title={location ? `Location ${location.name}` : 'Location'}
          desc={location ? `${location.type} · ${location.warehouse}` : ''}
          onClose={onClose}
        />
        <div className='modal-body' id='detail-body' data-comment='detail-body'>
          {location ? (
            <>
              <div className='detail-bar-row' data-comment='detail-bar-row'>
                <span
                  className={`mono${over ? ' danger-text' : ''}`}
                  data-comment='detail-bar-amount'
                >
                  {fmtN(current)} / {fmtN(location.maxWeight)} lb
                </span>
                <span className={`mono${over ? ' danger-text' : ''}`} data-comment='detail-bar-pct'>
                  {pct}%
                </span>
              </div>
              <div className='detail-bar' data-comment='detail-bar'>
                <span style={{ width: `${Math.min(pct, 100)}%`, background: barColor(location) }} />
              </div>

              {over ? (
                <div className='detail-over-note' data-comment='detail-over-note'>
                  <TriangleAlert style={{ width: '14px', height: '14px' }} />
                  Over soft weight limit
                </div>
              ) : null}

              <div className='cap-row' data-comment='detail-cap-row'>
                <span data-comment='detail-cap-count'>
                  <b className='mono'>
                    {orderCount(location)} / {orderCap(location)}
                  </b>{' '}
                  order{orderCap(location) > 1 ? 's' : ''}
                </span>
                <span data-comment='detail-cap-kind'>
                  ·&nbsp;{isMulti(location) ? 'Multi-order location' : 'Single-order location'}
                </span>
                <span
                  className={`cap-badge ${isFull(location) ? 'full' : 'avail'}`}
                  data-comment='detail-cap-badge'
                >
                  {isFull(location) ? 'Full' : 'Available'}
                </span>
              </div>

              {!location.occupants.length ? (
                <div className='empty' data-comment='detail-empty'>
                  <h3 data-comment='detail-empty-title'>Empty location</h3>
                  <p data-comment='detail-empty-text'>
                    Available — no orders currently staged here.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className='table-wrap'
                    data-comment='detail-table-wrap'
                    style={{ marginTop: '16px' }}
                  >
                    <table className='grid' data-comment='detail-table'>
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Dept</th>
                          <th>Weight</th>
                          <th style={{ width: '112px' }}>Status</th>
                          <th style={{ width: '128px' }}>Auto-release</th>
                          <th style={{ width: '44px' }} />
                        </tr>
                      </thead>
                      <tbody data-comment='detail-tbody'>
                        {location.occupants.map((occupant, index) => {
                          const comment = `detail-row-${index}`
                          const msLeft =
                            AUTO_RELEASE_MS - (now - lastScanAt(location.id, occupant.order))

                          return (
                            <tr data-comment={comment} key={occupant.order}>
                              <td className='mono-cell' data-comment={`${comment}-order`}>
                                {occupant.order}
                              </td>
                              <td data-comment={`${comment}-dept`}>{occupant.dept}</td>
                              <td className='mono-cell' data-comment={`${comment}-weight`}>
                                {fmtN(occupant.weight)} lb
                              </td>
                              <td data-comment={`${comment}-status`}>
                                <span
                                  className={`status ${STATUS_CLASS[occupant.status] ?? 'st-stock'}`}
                                >
                                  <span className='st-dot' />
                                  {occupant.status}
                                </span>
                              </td>
                              <td data-comment={`${comment}-countdown`}>
                                <span className={`countdown${msLeft <= 0 ? ' is-due' : ''}`}>
                                  {msLeft <= 0
                                    ? 'Releasing…'
                                    : `Auto-releases in ${fmtCountdown(msLeft)}`}
                                </span>
                              </td>
                              <td className='occ-cell' data-comment={`${comment}-act`}>
                                <button
                                  className='occ-remove'
                                  data-comment={`${comment}-remove`}
                                  title='Remove from location'
                                  aria-label='Remove from location'
                                  onClick={() => removeOccupant(location.id, index)}
                                >
                                  <X style={{ width: '14px', height: '14px' }} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className='release-note' data-comment='detail-release-note'>
                    <Timer
                      style={{ width: '14px', height: '14px', flex: 'none', marginTop: '1px' }}
                    />
                    <div className='release-note-body' data-comment='detail-release-body'>
                      <div data-comment='detail-release-text'>
                        Frees on removal, or automatically <b>15 min</b> after Shipping scans the
                        last package onto a truck.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </Overlay>
  )
}
