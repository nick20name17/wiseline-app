import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { truckHasEnRouteLoad } from '../selectors'
import { setTruckNotes, shippingStore } from '../store'

/**
 * One free-text note per truck, the same text the Schedule modal shows beside the truck it belongs to.
 *
 * The textarea commits on blur rather than on every keystroke, as the prototype's `onchange` does — a
 * note is written and then left, and the Schedule modal should not redraw under a half-typed word.
 */
export const TruckNotesModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const trucks = useStore(shippingStore, state => state.trucks)
  const loads = useStore(shippingStore, state => state.loads)

  return (
    <Overlay id='overlay-trucknotes' comment='overlay-trucknotes' open={open} onClose={onClose}>
      <div className='modal wide' data-comment='trucknotes-modal' data-component='dialog'>
        <ModalHead
          comment='trucknotes-head'
          titleComment='trucknotes-title'
          descComment='trucknotes-desc'
          title='Trucks Notes'
          desc='Free-text notes per truck (101–104). Shared with the Schedule modal.'
          onClose={onClose}
        />
        <div className='modal-body' id='trucknotes-body' data-comment='trucknotes-body'>
          {trucks.map(truck => {
            const enRoute = truckHasEnRouteLoad(truck.id, loads)

            return (
              <div
                className={`strow${enRoute ? ' unavail' : ''}`}
                data-comment={`tn-row-${truck.id}`}
                key={truck.id}
              >
                <div className='strow-main'>
                  <div className='strow-field'>
                    <div className='strow-label'>Truck</div>
                    <div className='strow-val' data-comment={`tn-truckname-${truck.id}`}>
                      Truck {truck.id}
                      {enRoute ? (
                        <>
                          {' '}
                          <span className='unavail-flag' data-comment={`tn-unavail-${truck.id}`}>
                            In transit
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className='strow-field'>
                    <div className='strow-label'>Truck Location</div>
                    <div className='strow-val' data-comment={`tn-truckloc-${truck.id}`}>
                      {truck.location}
                    </div>
                  </div>
                  <div className='strow-field'>
                    <div className='strow-label'>Weight Limit</div>
                    <div className='strow-val mono' data-comment={`tn-truckweight-${truck.id}`}>
                      {truck.maxWeight.toLocaleString('en-US')} lb
                    </div>
                  </div>
                  <div className='strow-field'>
                    <div className='strow-label'>Length</div>
                    <div className='strow-val mono' data-comment={`tn-trucklen-${truck.id}`}>
                      {truck.maxLength}&quot;
                    </div>
                  </div>
                </div>
                <div className='strow-notes'>
                  <div className='strow-label'>Truck Notes</div>
                  <textarea
                    data-comment={`tn-notes-${truck.id}`}
                    placeholder='Notes for this truck…'
                    defaultValue={truck.notes}
                    onBlur={event => setTruckNotes(truck.id, event.target.value)}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className='modal-foot' data-comment='trucknotes-foot'>
          <button className='btn btn-ghost' data-comment='trucknotes-close' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Overlay>
  )
}
