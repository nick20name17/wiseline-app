import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import {
  CoilAdjustFields,
  TRIM_ADJUST_ANCHORS,
  useCoilAdjustDraft,
  type CoilAdjustField
} from '@/features/coils/adjust-form'

import { adjustCoil, depleteCoil, trimStore } from '../store'
import { askConfirm, closeConfirm, showToast } from '../ui'

import type { Coil } from '@/store/shared/coils'

export type CoilAdjustCtx = { coilId: Coil['id']; focusField: CoilAdjustField }

/**
 * #193: the Coil Adjustment window, opened from a lot's Coil Thickness, Linear Feet or Weight.
 *
 * Entering any one of the three recomputes the other two, but only once Material Thickness and Core OD
 * are both known. Apply is gated on the same two plus all three numbers — a cleared field would
 * otherwise reach EBMS as 0, a coil reported as spent that nobody ever depleted.
 */
export const CoilAdjust = ({
  ctx,
  onClose
}: {
  ctx: CoilAdjustCtx | null
  onClose: () => void
}) => {
  const coils = useStore(trimStore, state => state.coils)
  const coil = coils.find(candidate => candidate.id === ctx?.coilId)
  const { draft, geom, ready, setField, setSetup, values } = useCoilAdjustDraft(coil)

  const apply = () => {
    if (!ready || !coil || !geom) return

    const next = values()

    if (next.thickness <= 0) {
      askConfirm(
        'Deplete & delete this coil?',
        `You have entered the coil size as 0 — this will completely deplete coil ${coil.coilNumber} and delete it. Are you sure you want to continue?`,
        () => {
          closeConfirm()
          depleteCoil(coil.id)
          onClose()
          showToast(`Coil ${coil.coilNumber} zeroed out in EBMS and deleted`)
        },
        'Yes, Deplete & Delete Coil',
        'No'
      )
      return
    }

    askConfirm(
      'Make this adjustment?',
      `By clicking Yes, the new Linear Feet amount (${next.linearFeet.toLocaleString()} ft) gets pushed back into EBMS for coil ${coil.coilNumber}.`,
      () => {
        closeConfirm()
        adjustCoil(coil.id, next)
        onClose()
        showToast('Adjustment pushed to EBMS (linear feet updated)')
      },
      'Yes, Make Adjustment',
      'No'
    )
  }

  return (
    <Overlay id='overlay-cadjust' comment='overlay-cadjust' open={!!coil} onClose={onClose}>
      <div className='modal wide' data-comment='cadjust-modal' data-component='dialog'>
        <ModalHead
          comment='cadjust-head'
          titleComment='cadjust-title'
          descComment='cadjust-desc'
          title='Coil Adjustment'
          desc='Enter Coil Thickness, Linear Feet or Weight — the other two follow from the Material Thickness and Core OD.'
          onClose={onClose}
        />
        <div className='modal-body' id='cadjust-body' data-comment='cadjust-body'>
          {coil ? (
            <CoilAdjustFields
              coil={coil}
              anchors={TRIM_ADJUST_ANCHORS}
              focusField={ctx?.focusField}
              draft={draft}
              geom={geom}
              setField={setField}
              setSetup={setSetup}
            />
          ) : null}
        </div>
        <div className='modal-foot' data-comment='cadjust-foot'>
          <button className='btn btn-ghost' data-comment='cadjust-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='cadjust-apply'
            data-comment='cadjust-apply'
            disabled={!ready}
            onClick={apply}
          >
            Apply
          </button>
        </div>
      </div>
    </Overlay>
  )
}
