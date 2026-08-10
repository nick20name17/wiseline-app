import { useState } from 'react'
import { Calendar, Image, Info } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate } from '../format'
import { longestOf, orderById, sumWeight, truckHasEnRouteLoad } from '../selectors'
import { applySchedule, setTruckNotes, shippingStore } from '../store'
import { openCalendar, showToast } from '../ui'
import { MapButton } from './bits'

/** The orders being scheduled — from Unscheduled's toolbar, or Reschedule off the Scheduled grid. */
export type ScheduleCtx = { orderIds: number[] }

/**
 * Ship date first, then a truck, then Apply.
 *
 * The truck rows stay disabled until there is a date, because a truck's availability is a question
 * about a day: one already out on the road cannot take another load, and without a date there is
 * nothing to ask. Weight and length turn red on the row that is ticked, against that truck's limits.
 */
export const ScheduleModal = ({
  ctx,
  onClose
}: {
  ctx: ScheduleCtx | null
  onClose: () => void
}) => {
  const orders = useStore(shippingStore, state => state.orders)
  const trucks = useStore(shippingStore, state => state.trucks)
  const loads = useStore(shippingStore, state => state.loads)
  const [shipDate, setShipDate] = useState<string | null>(null)
  const [truckId, setTruckId] = useState<number | null>(null)
  const [tab, setTab] = useState<'trucknotes' | 'map'>('trucknotes')

  const selected = (ctx?.orderIds ?? [])
    .map(id => orderById(id, orders))
    .filter((order): order is NonNullable<typeof order> => !!order)
  const delivery = selected.filter(order => !order.pickup)
  const pickups = selected.filter(order => order.pickup)
  const deliveryWeight = sumWeight(delivery)
  const deliveryLength = longestOf(delivery)
  const pickupWeight = sumWeight(pickups)
  const pickupLength = longestOf(pickups)

  const apply = () => {
    if (!ctx || !shipDate || !truckId) return
    applySchedule(ctx.orderIds, truckId, shipDate)
    showToast(
      `Scheduled ${ctx.orderIds.length} order(s) to Truck ${truckId} · ${fmtDate(shipDate)}`
    )
    onClose()
  }

  return (
    <Overlay id='overlay-schedule' comment='overlay-schedule' open={!!ctx} onClose={onClose}>
      <div className='modal wide' data-comment='schedule-modal' data-component='dialog'>
        <ModalHead
          comment='schedule-head'
          titleComment='schedule-title'
          descComment='schedule-desc'
          title='Schedule orders'
          desc='Select a Ship Date, then assign a truck. Expand orders, view the map, and deal with notes without losing your selection.'
          onClose={onClose}
        />
        <div className='modal-body' id='schedule-body' data-comment='schedule-body'>
          <button
            className='field-btn'
            data-comment='schedmodal-shipdate-btn'
            style={{ minWidth: '200px', justifyContent: 'flex-start', marginBottom: '16px' }}
            onClick={() =>
              openCalendar({
                desc: `Ship date for ${ctx?.orderIds.length ?? 0} selected order(s).`,
                preset: shipDate,
                onSet: setShipDate
              })
            }
          >
            <Calendar style={{ width: '14px', height: '14px' }} />
            {shipDate ? fmtDate(shipDate) : 'Enter Ship Date…'}
          </button>

          <div className='sumboxes' data-comment='schedmodal-sumboxes'>
            <div className='sumbox' data-comment='schedmodal-sumbox-delivery'>
              <div className='sumbox-title'>Selected Delivery Orders</div>
              <div className='sumbox-row'>
                <span>Total #</span>
                <b>{delivery.length}</b>
              </div>
              <div className='sumbox-row'>
                <span>Total Weight</span>
                <b>{deliveryWeight.toLocaleString('en-US')} lb</b>
              </div>
              <div className='sumbox-row'>
                <span>Longest Length</span>
                <b>{deliveryLength}&quot;</b>
              </div>
            </div>
            <div className='sumbox' data-comment='schedmodal-sumbox-pickup'>
              <div className='sumbox-title'>Selected Pickups</div>
              <div className='sumbox-row'>
                <span>Total #</span>
                <b>{pickups.length}</b>
              </div>
              <div className='sumbox-row'>
                <span>Total Weight</span>
                <b>{pickupWeight.toLocaleString('en-US')} lb</b>
              </div>
              <div className='sumbox-row'>
                <span>Longest Length</span>
                <b>{pickupLength}&quot;</b>
              </div>
            </div>
          </div>

          <div className='subtabs' data-comment='schedmodal-subtabs'>
            <button
              className={`subtab ${tab === 'trucknotes' ? 'active' : ''}`}
              data-comment='schedmodal-tab-trucknotes'
              onClick={() => setTab('trucknotes')}
            >
              Truck Notes
            </button>
            <button
              className={`subtab ${tab === 'map' ? 'active' : ''}`}
              data-comment='schedmodal-tab-map'
              onClick={() => setTab('map')}
            >
              Viewing the Map
            </button>
          </div>

          {tab === 'trucknotes' ? (
            <>
              {!shipDate ? (
                <div className='sched-datehint' data-comment='schedmodal-datehint'>
                  <Info style={{ width: '14px', height: '14px' }} />
                  Pick a Ship Date above to enable truck selection.
                </div>
              ) : null}
              {trucks.map(truck => {
                const enRoute = truckHasEnRouteLoad(truck.id, loads)
                const checked = truckId === truck.id
                const canCheck = !!shipDate && !enRoute
                const weightOver = checked && deliveryWeight + pickupWeight > truck.maxWeight
                const lengthOver =
                  checked && Math.max(deliveryLength, pickupLength) > truck.maxLength

                return (
                  <div
                    className={`strow ${weightOver || lengthOver ? 'over' : ''}${enRoute ? ' unavail' : ''}`}
                    data-comment={`schedmodal-truckrow-${truck.id}`}
                    title={
                      enRoute
                        ? `Truck ${truck.id} is in transit — unavailable for new assignments`
                        : ''
                    }
                    key={truck.id}
                  >
                    <div className='strow-check'>
                      <input
                        type='checkbox'
                        className='chk'
                        data-comment={`schedmodal-truckchk-${truck.id}`}
                        checked={checked}
                        disabled={!canCheck}
                        onChange={() => setTruckId(checked ? null : truck.id)}
                      />
                    </div>
                    <div className='strow-main'>
                      <div className='strow-field'>
                        <div className='strow-label'>Truck</div>
                        <div
                          className='strow-val'
                          data-comment={`schedmodal-truckname-${truck.id}`}
                        >
                          Truck {truck.id}
                          {enRoute ? (
                            <>
                              {' '}
                              <span
                                className='unavail-flag'
                                data-comment={`schedmodal-truckunavail-${truck.id}`}
                              >
                                In transit — Unavailable
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className='strow-field'>
                        <div className='strow-label'>Truck Location</div>
                        <div className='strow-val' data-comment={`schedmodal-truckloc-${truck.id}`}>
                          {truck.location}
                        </div>
                      </div>
                      <div className='strow-field'>
                        <div className='strow-label'>Weight Limit</div>
                        <div
                          className='strow-val mono'
                          data-comment={`schedmodal-truckweight-${truck.id}`}
                        >
                          {truck.maxWeight.toLocaleString('en-US')} lb
                        </div>
                      </div>
                      <div className='strow-field'>
                        <div className='strow-label'>Length</div>
                        <div
                          className='strow-val mono'
                          data-comment={`schedmodal-trucklen-${truck.id}`}
                        >
                          {truck.maxLength}&quot;
                        </div>
                      </div>
                      <div className='strow-field'>
                        <div className='strow-label'>Assigned Delivery Orders</div>
                        <div
                          className='strow-val mono'
                          data-comment={`schedmodal-truckassigned-${truck.id}`}
                        >
                          {checked ? (
                            <>
                              <span className={weightOver ? 'over-txt' : ''}>
                                {deliveryWeight.toLocaleString('en-US')} lb
                              </span>{' '}
                              /{' '}
                              <span className={lengthOver ? 'over-txt' : ''}>
                                {deliveryLength}&quot;
                              </span>
                            </>
                          ) : (
                            '—'
                          )}
                        </div>
                      </div>
                      <div className='strow-field'>
                        <div className='strow-label'>Assigned Pickups</div>
                        <div
                          className='strow-val mono'
                          data-comment={`schedmodal-truckassignedpu-${truck.id}`}
                        >
                          {checked
                            ? `${pickupWeight.toLocaleString('en-US')} lb / ${pickupLength}"`
                            : '—'}
                        </div>
                      </div>
                    </div>
                    <div className='strow-notes'>
                      <div className='strow-label'>Truck Notes</div>
                      <textarea
                        data-comment={`schedmodal-trucknotes-${truck.id}`}
                        placeholder='Notes for this truck…'
                        defaultValue={truck.notes}
                        onBlur={event => setTruckNotes(truck.id, event.target.value)}
                      />
                    </div>
                    <div className='strow-photo' data-comment={`schedmodal-truckphoto-${truck.id}`}>
                      <Image style={{ width: '14px', height: '14px' }} />
                      Update Image
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <div className='table-wrap' data-comment='schedmodal-map-tablewrap'>
              <div className='table-scroll'>
                <table className='grid' data-comment='schedmodal-map-table'>
                  <thead>
                    <tr>
                      <th style={{ width: '88px' }}>Order #</th>
                      <th>Customer</th>
                      <th style={{ width: '120px' }}>City</th>
                      <th style={{ width: '44px' }}>Map</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map(order => (
                      <tr data-comment={`schedmodal-maprow-${order.id}`} key={order.id}>
                        <td className='cell-order' data-comment={`schedmodal-maporder-${order.id}`}>
                          {order.order}
                        </td>
                        <td className='cell-cust' data-comment={`schedmodal-mapcust-${order.id}`}>
                          {order.customer}
                        </td>
                        <td data-comment={`schedmodal-mapcity-${order.id}`}>{order.city}</td>
                        <td data-comment={`schedmodal-mappin-${order.id}`}>
                          <MapButton order={order} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className='modal-foot' data-comment='schedule-foot'>
          <button className='btn btn-ghost' data-comment='schedule-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-green'
            id='schedule-apply'
            data-comment='schedule-applybtn'
            disabled={!(shipDate && truckId)}
            onClick={apply}
          >
            Apply
          </button>
        </div>
      </div>
    </Overlay>
  )
}
