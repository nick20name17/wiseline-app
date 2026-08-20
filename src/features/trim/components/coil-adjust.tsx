import { useState } from 'react'

import { useStore } from '@/store/create-store'
import {
  coilLfFromThickness,
  coilLfFromWeight,
  coilThicknessFromLf,
  coilWeightFromLf
} from '@/store/shared/coils'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { adjustCoil, depleteCoil, trimStore } from '../store'
import { askConfirm, closeConfirm, showToast } from '../ui'

import type { Coil } from '@/store/shared/coils'

export type CoilAdjustCtx = { coilId: Coil['id']; focusField: Field }

type Field = 'thickness' | 'linearFeet' | 'weight'

type Draft = Record<Field | 'materialThickness' | 'coreOD', string>

const FIELDS: { key: Field; label: string; unit: string; step: string }[] = [
  { key: 'thickness', label: 'Coil Thickness', unit: 'inches', step: '0.01' },
  { key: 'linearFeet', label: 'Linear Feet', unit: 'feet', step: '1' },
  { key: 'weight', label: 'Weight', unit: 'lbs', step: '1' }
]

const num = (value: string) => Number.parseFloat(value)

/** Both numbers present and positive is what makes the annulus solvable — and what unlocks the form. */
const geomOf = (draft: Draft) => {
  const mt = num(draft.materialThickness)
  const od = num(draft.coreOD)
  return mt > 0 && od > 0 ? { mt, od } : null
}

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

  // the route keys this on the coil being adjusted, so the draft is seeded once on mount rather than
  // written back by an effect every time the id changes
  const [draft, setDraft] = useState<Draft>(() => ({
    thickness: coil?.thickness != null ? String(coil.thickness) : '',
    linearFeet: coil ? String(coil.linearFeet) : '',
    weight: coil ? String(coil.weight) : '',
    materialThickness: coil?.materialThickness != null ? String(coil.materialThickness) : '',
    coreOD: coil?.coreOD != null ? String(coil.coreOD) : ''
  }))

  const geom = geomOf(draft)
  const ready =
    !!geom && FIELDS.every(field => draft[field.key] !== '' && num(draft[field.key]) >= 0)

  const solve = (current: Draft, field: Field, raw: string, width: number): Draft => {
    const next = { ...current, [field]: raw }
    const solvable = geomOf(next)
    const value = num(raw)
    if (!solvable || !(value >= 0)) return next

    const lf =
      field === 'thickness'
        ? coilLfFromThickness(value, solvable.mt, solvable.od)
        : field === 'weight'
          ? coilLfFromWeight(value, width, solvable.mt)
          : Math.round(value)

    if (field !== 'thickness')
      next.thickness = String(coilThicknessFromLf(lf, solvable.mt, solvable.od))
    if (field !== 'linearFeet') next.linearFeet = String(lf)
    if (field !== 'weight') next.weight = String(coilWeightFromLf(lf, width, solvable.mt))
    return next
  }

  const setField = (field: Field, raw: string) => {
    const width = coil?.width ?? 0
    setDraft(current => solve(current, field, raw, width))
  }

  const setSetup = (field: 'materialThickness' | 'coreOD', raw: string) => {
    const width = coil?.width ?? 0
    setDraft(current => {
      const next = { ...current, [field]: raw }
      // a coil EBMS has only just pushed in has Linear Feet but no thickness — the moment the geometry
      // is known that thickness is computable, so fill it rather than leave the field blank
      if (geomOf(next) && next.thickness === '' && num(next.linearFeet) > 0)
        return solve(next, 'linearFeet', next.linearFeet, width)
      return next
    })
  }

  const apply = () => {
    if (!ready || !coil || !geom) return

    const thickness = num(draft.thickness)

    if (thickness <= 0) {
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
      `By clicking Yes, the new Linear Feet amount (${Number(draft.linearFeet).toLocaleString()} ft) gets pushed back into EBMS for coil ${coil.coilNumber}.`,
      () => {
        closeConfirm()
        adjustCoil(coil.id, {
          thickness,
          linearFeet: Math.round(num(draft.linearFeet)) || 0,
          weight: Math.round(num(draft.weight)) || 0,
          materialThickness: geom.mt,
          coreOD: geom.od
        })
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
            <>
              <div className='cadj-row' data-comment='cadjust-row-main'>
                {FIELDS.map(field => (
                  <label
                    className='cadj-field'
                    key={field.key}
                    data-comment={`cadjust-field-${field.key}`}
                  >
                    <span className='cadj-label'>{field.label}:</span>
                    <input
                      type='number'
                      step={field.step}
                      className='cadj-input mono'
                      data-comment={`cadjust-input-${field.key}`}
                      autoFocus={ctx?.focusField === field.key}
                      value={draft[field.key]}
                      disabled={!geom}
                      onChange={event => setField(field.key, event.target.value)}
                    />
                    <span className='cadj-unit subtle'>{field.unit}</span>
                  </label>
                ))}
              </div>

              <div className='cadj-row cadj-row-setup' data-comment='cadjust-row-setup'>
                <label className='cadj-field' data-comment='cadjust-field-mt'>
                  <span className='cadj-label cadj-label-soft'>Material Thickness:</span>
                  <input
                    type='number'
                    step='0.001'
                    className='cadj-input mono'
                    data-comment='cadjust-input-mt'
                    value={draft.materialThickness}
                    onChange={event => setSetup('materialThickness', event.target.value)}
                  />
                  <span className='cadj-unit subtle'>inches</span>
                </label>
                <label className='cadj-field' data-comment='cadjust-field-od'>
                  <span className='cadj-label cadj-label-soft'>Core OD:</span>
                  <input
                    type='number'
                    step='0.1'
                    className='cadj-input mono'
                    data-comment='cadjust-input-od'
                    value={draft.coreOD}
                    onChange={event => setSetup('coreOD', event.target.value)}
                  />
                  <span className='cadj-unit subtle'>inches</span>
                </label>
              </div>

              {geom ? null : (
                <div className='cadj-gate' data-comment='cadjust-gate'>
                  Enter Material Thickness and Core OD to unlock the three fields above and the
                  Apply button.
                </div>
              )}

              <div className='cadj-coilrow' data-comment='cadjust-coilrow'>
                <span data-comment='cadjust-coil-pid'>
                  <b>Product ID:</b> <span className='mono'>{coil.productId}</span>
                </span>
                <span data-comment='cadjust-coil-gauge'>
                  <b>Gauge:</b>{' '}
                  {coil.gauge != null ? (
                    <span className='mono'>{coil.gauge}</span>
                  ) : (
                    <span className='subtle'>—</span>
                  )}
                </span>
                <span data-comment='cadjust-coil-color'>
                  <b>Color:</b> {coil.color}
                </span>
                <span data-comment='cadjust-coil-width'>
                  <b>Width (in.):</b> <span className='mono'>{coil.width}</span>
                </span>
                <span data-comment='cadjust-coil-num'>
                  <b>Coil #:</b> <span className='mono'>{coil.coilNumber}</span>
                </span>
              </div>
            </>
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
