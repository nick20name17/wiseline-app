import { useState } from 'react'

import {
  coilLfFromThickness,
  coilLfFromWeight,
  coilThicknessFromLf,
  coilWeightFromLf
} from '@/store/shared/coils'

import type { Coil } from '@/store/shared/coils'

export type CoilAdjustField = 'thickness' | 'linearFeet' | 'weight'

type Draft = Record<CoilAdjustField | 'materialThickness' | 'coreOD', string>

const FIELDS: { key: CoilAdjustField; label: string; unit: string; step: string }[] = [
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
 * The Coil Adjustment window's arithmetic, shared by the two pages that show the window (#128).
 *
 * Trim had it first (#193); the plant-wide Coils page reached the same coil through a keypad and a
 * summary table instead, and Kevin asked for one window, not two. The geometry is the reason to share
 * rather than copy: entering any of the three numbers derives the other two from the wind of the coil,
 * and two implementations of that would eventually disagree about the same physical coil.
 */
export const useCoilAdjustDraft = (coil: Coil | undefined) => {
  // keyed on the coil by both callers, so the draft is seeded on mount rather than synced by an effect
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

  const solve = (current: Draft, field: CoilAdjustField, raw: string, width: number): Draft => {
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

  const setField = (field: CoilAdjustField, raw: string) => {
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

  const values = () => ({
    thickness: num(draft.thickness),
    linearFeet: Math.round(num(draft.linearFeet)) || 0,
    weight: Math.round(num(draft.weight)) || 0,
    materialThickness: geom?.mt ?? 0,
    coreOD: geom?.od ?? 0
  })

  return { draft, geom, ready, setField, setSetup, values }
}

/**
 * The two anchor sets this window is drawn under, named rather than built from a loose string: a
 * `data-comment` is the key a review comment is joined to, so the set has to be enumerable and no
 * caller may mint a third one.
 *
 * `coilRow` is spelled out because the two pages disagree. Trim's strip has been `cadjust-coilrow`
 * since #193 and carries #122/#124; on the Coils page `adjust-coilrow` already means something else in
 * the prototype — the summary table's row — so the strip takes a name of its own rather than landing
 * that page's comments on the wrong element.
 */
export type CoilAdjustAnchors = { prefix: string; coilRow: string }

export const TRIM_ADJUST_ANCHORS: CoilAdjustAnchors = {
  prefix: 'cadjust',
  coilRow: 'cadjust-coilrow'
}

export const COILS_ADJUST_ANCHORS: CoilAdjustAnchors = {
  prefix: 'adjust',
  coilRow: 'adjust-coilinfo'
}

/** The window's body: the three numbers, the geometry that unlocks them, and the coil they belong to. */
export const CoilAdjustFields = ({
  coil,
  anchors,
  focusField,
  draft,
  geom,
  setField,
  setSetup
}: {
  coil: Coil
  anchors: CoilAdjustAnchors
  focusField?: CoilAdjustField
  draft: Draft
  geom: { mt: number; od: number } | null
  setField: (field: CoilAdjustField, raw: string) => void
  setSetup: (field: 'materialThickness' | 'coreOD', raw: string) => void
}) => (
  <>
    <div className='cadj-row' data-comment={`${anchors.prefix}-row-main`}>
      {FIELDS.map(field => (
        <label className='cadj-field' key={field.key} data-comment={`${anchors.prefix}-field-${field.key}`}>
          <span className='cadj-label'>{field.label}:</span>
          <input
            type='number'
            step={field.step}
            className='cadj-input mono'
            data-comment={`${anchors.prefix}-input-${field.key}`}
            autoFocus={focusField === field.key}
            value={draft[field.key]}
            disabled={!geom}
            onChange={event => setField(field.key, event.target.value)}
          />
          <span className='cadj-unit subtle'>{field.unit}</span>
        </label>
      ))}
    </div>

    <div className='cadj-row cadj-row-setup' data-comment={`${anchors.prefix}-row-setup`}>
      <label className='cadj-field' data-comment={`${anchors.prefix}-field-mt`}>
        <span className='cadj-label cadj-label-soft'>Material Thickness:</span>
        <input
          type='number'
          step='0.001'
          className='cadj-input mono'
          data-comment={`${anchors.prefix}-input-mt`}
          value={draft.materialThickness}
          onChange={event => setSetup('materialThickness', event.target.value)}
        />
        <span className='cadj-unit subtle'>inches</span>
      </label>
      <label className='cadj-field' data-comment={`${anchors.prefix}-field-od`}>
        <span className='cadj-label cadj-label-soft'>Core OD:</span>
        <input
          type='number'
          step='0.1'
          className='cadj-input mono'
          data-comment={`${anchors.prefix}-input-od`}
          value={draft.coreOD}
          onChange={event => setSetup('coreOD', event.target.value)}
        />
        <span className='cadj-unit subtle'>inches</span>
      </label>
    </div>

    {geom ? null : (
      <div className='cadj-gate' data-comment={`${anchors.prefix}-gate`}>
        Enter Material Thickness and Core OD to unlock the three fields above and the Apply button.
      </div>
    )}

    <div className='cadj-coilrow' data-comment={anchors.coilRow}>
      <span data-comment={`${anchors.prefix}-coil-pid`}>
        <b>Product ID:</b> <span className='mono'>{coil.productId}</span>
      </span>
      <span data-comment={`${anchors.prefix}-coil-gauge`}>
        <b>Gauge:</b>{' '}
        {coil.gauge != null ? (
          <span className='mono'>{coil.gauge}</span>
        ) : (
          <span className='subtle'>—</span>
        )}
      </span>
      <span data-comment={`${anchors.prefix}-coil-color`}>
        <b>Color:</b> {coil.color}
      </span>
      <span data-comment={`${anchors.prefix}-coil-width`}>
        <b>Width (in.):</b> <span className='mono'>{coil.width}</span>
      </span>
      <span data-comment={`${anchors.prefix}-coil-num`}>
        <b>Coil #:</b> <span className='mono'>{coil.coilNumber}</span>
      </span>
    </div>
  </>
)
