import { useState } from 'react'
import { ChevronDown, ClipboardPaste, List } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'
import { usePopover } from '@/components/shell/pop'

import { supplierName } from '../selectors'
import { assignUnits, rollformingStore } from '../store'
import { openCoilPick, showToast } from '../ui'

/** Which units are being assigned, and whether the Manager called it a cutlist. */
export type AssignCtx = {
  orderId: number
  units: { lineId: number; coilIdx: number }[]
  asCutlist: boolean
}

/**
 * Supplier first, Coil Number second — and the second is disabled until the first is answered.
 *
 * A coil number without a supplier names nothing: the same number can exist at two mills. That is why
 * the field greys out rather than being validated afterwards, and why changing the supplier clears it.
 */
export const AssignModal = ({ ctx, onClose }: { ctx: AssignCtx | null; onClose: () => void }) => {
  const state = useStore(rollformingStore, current => current)
  const { openPop, popNode } = usePopover()

  const order = state.orders.find(candidate => candidate.id === ctx?.orderId)
  const first = ctx
    ? order?.lineItems.find(item => item.id === ctx.units[0]?.lineId)?.coils[
        ctx.units[0]?.coilIdx ?? 0
      ]
    : undefined

  // the form opens on what the first picked unit already carries; a bulk pick starts its number blank.
  // The mount site keys this component per opening, so these initial values are re-read each time.
  const [supplierId, setSupplierId] = useState<number | null>(first?.supplierId ?? null)
  const [coilNumber, setCoilNumber] = useState(
    ctx?.units.length === 1 ? (first?.coilNumber ?? '') : ''
  )

  const picked = state.copiedCoilNumber
  const units = ctx?.units.length ?? 0
  const coilDisabled = !supplierId

  const confirm = () => {
    if (!ctx) return
    assignUnits(ctx.orderId, ctx.units, supplierId, coilNumber)
    onClose()
    showToast(
      `Assigned ${supplierId ? supplierName(supplierId, state.suppliers) : 'Undefined'}${
        coilNumber ? ` · ${coilNumber}` : ''
      } to ${units} line${units > 1 ? 's' : ''}`
    )
  }

  return (
    <Overlay id='overlay-assign' comment='overlay-assign' open={!!ctx && !!first} onClose={onClose}>
      <div className='modal' data-comment='assign-modal' data-component='dialog'>
        <ModalHead
          comment='assign-head'
          titleComment='assign-title'
          descComment='assign-desc'
          title={ctx?.asCutlist ? 'Create Cutlist' : 'Select Supplier / Coil Number'}
          desc={`Assign a Supplier, then optionally a Coil Number, to ${units} coil line${
            units > 1 ? 's' : ''
          }. Coil Number stays greyed out until a Supplier is chosen.`}
          onClose={onClose}
        />
        <div className='modal-body' id='assign-body' data-comment='assign-body'>
          <div data-comment='assign-f-supplier' style={{ marginBottom: '12px' }}>
            <label
              className='subhead-title'
              data-comment='assign-l-supplier'
              style={{ display: 'block', marginBottom: '5px' }}
            >
              Supplier
            </label>
            <button
              className='field-btn'
              data-pop-anchor
              data-comment='assign-supplier-btn'
              style={{ width: '100%' }}
              onClick={event => {
                event.stopPropagation()
                openPop<number>(
                  event.currentTarget,
                  [
                    { label: 'Undefined', value: 0 },
                    ...state.suppliers.map(entry => ({ label: entry.name, value: entry.id }))
                  ],
                  value => {
                    setSupplierId(value || null)
                    setCoilNumber('')
                  },
                  supplierId ?? 0
                )
              }}
            >
              {supplierId ? supplierName(supplierId, state.suppliers) : 'Undefined'}
              <ChevronDown />
            </button>
          </div>

          <div data-comment='assign-f-coil'>
            <label
              className='subhead-title'
              data-comment='assign-l-coil'
              style={{ display: 'block', marginBottom: '5px' }}
            >
              Coil Number
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className='field-input'
                data-comment='assign-coil-input'
                style={{ flex: 1, width: 'auto' }}
                value={coilNumber}
                placeholder='e.g. CN-58831'
                disabled={coilDisabled}
                onChange={event => setCoilNumber(event.target.value)}
              />
              <button
                className='icon-btn'
                data-comment='assign-coil-paste'
                title='Paste copied Coil Number'
                disabled={coilDisabled || !picked}
                onClick={() => {
                  if (!picked) return
                  setCoilNumber(picked)
                  showToast(`Pasted Coil Number ${picked}`)
                }}
              >
                <ClipboardPaste style={{ width: '14px', height: '14px' }} />
              </button>
              <button
                className='btn btn-sm'
                data-comment='assign-coil-pick'
                disabled={coilDisabled}
                onClick={() => {
                  const item = order?.lineItems.find(entry => entry.id === ctx?.units[0]?.lineId)
                  if (!item) return
                  openCoilPick({
                    mode: 'assign',
                    color: item.color,
                    gauge: item.gauge,
                    onPick: number => {
                      setCoilNumber(number)
                      showToast(`Coil Number ${number} filled in`)
                    }
                  })
                }}
              >
                <List style={{ width: '14px', height: '14px' }} />
                Select Coil Number
              </button>
            </div>
            {coilDisabled ? (
              <div
                className='subtle'
                data-comment='assign-coil-hint'
                style={{ fontSize: '11px', marginTop: '5px' }}
              >
                Greyed out until a Supplier is chosen.
              </div>
            ) : null}
          </div>
        </div>
        <div className='modal-foot' data-comment='assign-foot'>
          <button className='btn btn-ghost' data-comment='assign-cancel' onClick={onClose}>
            Cancel
          </button>
          <button className='btn btn-primary' data-comment='assign-confirm' onClick={confirm}>
            Assign
          </button>
        </div>
      </div>
      {popNode}
    </Overlay>
  )
}
