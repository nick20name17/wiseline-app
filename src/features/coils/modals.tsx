import { useState } from 'react'

import type { Coil } from '@/store/shared/coils'

import { ModalHead, Overlay } from '@/components/shell/modal'
import { NumberInput } from '@/components/shell/number-input'

import {
  COILS_ADJUST_ANCHORS,
  CoilAdjustFields,
  useCoilAdjustDraft,
  type CoilAdjustField
} from './adjust-form'
import {
  applyCoilAdjust,
  COIL_USAGE,
  EMPTY_COIL_FILTER,
  removeCoil,
  type CoilFilter
} from './store'

/** N-111: the customer line items and Sales Orders behind a coil group's Total column. */
export const UsageModal = ({
  coil,
  onClose
}: {
  coil: (Coil & { productId: string }) | null
  onClose: () => void
}) => {
  const usage = coil ? COIL_USAGE[coil.productId] : undefined
  const lines = usage?.lines ?? []
  const total = lines.reduce((sum, line) => sum + line.qty, 0)

  return (
    <Overlay id='overlay-usage' comment='overlay-usage' open={!!coil} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '520px' }}
        data-comment='usage-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='usage-head'
          titleComment='usage-title'
          descComment='usage-desc'
          title={
            coil
              ? `${coil.width}" x ${usage?.length ?? ''} - ${coil.gauge}ga - ${coil.color}`
              : 'Coil usage'
          }
          desc='Customer line items & Sales Orders using this coil size.'
          onClose={onClose}
        />
        <div
          className='modal-body'
          id='usage-body'
          data-comment='usage-body'
          style={{ paddingBottom: '18px' }}
        >
          {!lines.length ? (
            <div className='empty' data-comment='usage-empty' style={{ padding: '28px 12px' }}>
              <h3 data-comment='usage-empty-title'>No orders on record</h3>
              <p data-comment='usage-empty-text'>No cutlists currently reference this coil size.</p>
            </div>
          ) : (
            <div data-comment='usage-list'>
              {lines.map((line, index) => (
                <div className='mrow' data-comment={`usage-row-${index}`} key={line.so}>
                  <span className='mrow-main' data-comment={`usage-main-${index}`}>
                    <span className='mrow-name' data-comment={`usage-cust-${index}`}>
                      {line.customer}
                    </span>
                    <span className='mrow-sub subtle' data-comment={`usage-sub-${index}`}>
                      <span className='mono-cell' data-comment={`usage-so-${index}`}>
                        {line.so}
                      </span>{' '}
                      · {line.item} · {line.length}
                    </span>
                  </span>
                  <span className='toolbar-spacer' />
                  <span className='chip blue' data-comment={`usage-qty-${index}`}>
                    {line.qty} pcs
                  </span>
                </div>
              ))}
              <div className='usage-total-row' data-comment='usage-total-row'>
                <span data-comment='usage-total-label'>Total</span>
                <span className='mono-cell' data-comment='usage-total-value'>
                  {total} pcs
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  )
}

/**
 * #128: the Coil Adjustment window, the same one Trim shows.
 *
 * It used to be this page's own thing — a summary table, three «current» cards and a keypad — while
 * Trim typed into three fields (#193). Kevin asked for one window; the fields and the geometry behind
 * them now come from `adjust-form`, and what is left here is the page's own confirm and the anchors its
 * comments are joined to.
 */
export const AdjustModal = ({
  coil,
  focusField,
  onClose,
  onConfirm
}: {
  coil: Coil | null
  focusField?: CoilAdjustField
  onClose: () => void
  onConfirm: (question: {
    title: string
    desc: string
    ok: string
    cancel: string
    /** what the toast says once it is done — a deleted coil and an adjusted one are not the same news */
    done: string
    onOk: () => void
  }) => void
}) => {
  const { draft, geom, ready, setField, setSetup, values } = useCoilAdjustDraft(coil ?? undefined)

  const apply = () => {
    if (!ready || !coil) return

    const next = values()

    if (next.thickness <= 0) {
      onConfirm({
        title: 'Deplete & delete this coil?',
        desc: `You have entered the coil size as 0 — this will completely deplete coil ${coil.coilNumber} and delete it. Are you sure you want to continue?`,
        ok: 'Yes, Deplete & Delete Coil',
        cancel: 'No',
        done: `Coil ${coil.coilNumber} zeroed out in EBMS and deleted`,
        onOk: () => removeCoil(coil.id)
      })
      return
    }

    onConfirm({
      title: 'Make this adjustment?',
      desc: `By clicking Yes, the new Linear Feet amount (${next.linearFeet.toLocaleString()} ft) gets pushed back into EBMS for coil ${coil.coilNumber}.`,
      ok: 'Yes, Make Adjustment',
      cancel: 'No',
      done: 'Adjustment pushed to EBMS (linear feet updated)',
      onOk: () => applyCoilAdjust(coil.id, next)
    })
  }

  return (
    <Overlay id='overlay-adjust' comment='overlay-adjust' open={!!coil} onClose={onClose}>
      <div className='modal wide' data-comment='adjust-modal' data-component='dialog'>
        <ModalHead
          comment='adjust-head'
          titleComment='adjust-title'
          descComment='adjust-desc'
          title='Coil Adjustment'
          desc='Enter Coil Thickness, Linear Feet or Weight — the other two follow from the Material Thickness and Core OD.'
          onClose={onClose}
        />
        <div className='modal-body' data-comment='adjust-body'>
          {coil ? (
            <CoilAdjustFields
              coil={coil}
              anchors={COILS_ADJUST_ANCHORS}
              focusField={focusField}
              draft={draft}
              geom={geom}
              setField={setField}
              setSetup={setSetup}
            />
          ) : null}
        </div>
        <div className='modal-foot' data-comment='adjust-foot'>
          <button className='btn btn-ghost' data-comment='adjust-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='adjust-apply'
            data-comment='adjust-apply'
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

const LEGS = [
  { key: 'thickness', label: 'Thickness', unit: 'in', step: '0.01' },
  { key: 'width', label: 'Width', unit: 'in', step: '1' },
  { key: 'grade', label: 'Grade', unit: 'ksi', step: '1' }
] as const

/**
 * The EBMS-style folder range filter: one Between/And per attribute, each with its own Apply All.
 *
 * Apply All is not a convenience — it is how the canvas describes a limitless range, so ticking it
 * disables that leg's inputs rather than clearing them.
 */
export const CoilFilterModal = ({
  open,
  filter,
  onClose,
  onApply
}: {
  open: boolean
  filter: CoilFilter
  onClose: () => void
  onApply: (filter: CoilFilter) => void
}) => {
  const [draft, setDraft] = useState(filter)

  return (
    <Overlay id='overlay-coilfilter' comment='overlay-coilfilter' open={open} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '500px' }}
        data-comment='coilfilter-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='coilfilter-head'
          titleComment='coilfilter-title'
          descComment='coilfilter-desc'
          title='Coil Filter'
          desc='Coils whose Thickness, Width and Grade ALL fall in range show up under their EBMS folder. Apply All makes that range limitless.'
          onClose={onClose}
        />
        <div className='modal-body' id='coilfilter-body' data-comment='coilfilter-body'>
          {LEGS.map(leg => {
            const all = draft[`${leg.key}All`]

            return (
              <div
                className={`cf-row${all ? ' is-all' : ''}`}
                data-comment={`coilfilter-row-${leg.key}`}
                key={leg.key}
              >
                <span className='cf-label' data-comment={`coilfilter-label-${leg.key}`}>
                  {leg.label}:
                </span>
                <span className='cf-between' data-comment={`coilfilter-between-${leg.key}`}>
                  Between
                </span>
                <NumberInput
                  variant='compact'
                  comment={`coilfilter-${leg.key}-min`}
                  ariaLabel={`${leg.label} min`}
                  step={+leg.step}
                  placeholder='0'
                  value={draft[`${leg.key}Min`]}
                  disabled={all}
                  onValueChange={next =>
                    setDraft(current => ({ ...current, [`${leg.key}Min`]: next }))
                  }
                />
                <span className='cf-amp'>&amp;</span>
                <NumberInput
                  variant='compact'
                  comment={`coilfilter-${leg.key}-max`}
                  ariaLabel={`${leg.label} max`}
                  step={+leg.step}
                  placeholder='No limit'
                  value={draft[`${leg.key}Max`]}
                  disabled={all}
                  onValueChange={next =>
                    setDraft(current => ({ ...current, [`${leg.key}Max`]: next }))
                  }
                />
                <span className='cf-unit subtle' data-comment={`coilfilter-unit-${leg.key}`}>
                  {leg.unit}
                </span>
                <label className='cf-all' data-comment={`coilfilter-all-${leg.key}`}>
                  <input
                    type='checkbox'
                    className='chk'
                    data-comment={`coilfilter-allchk-${leg.key}`}
                    checked={all}
                    onChange={() => setDraft(current => ({ ...current, [`${leg.key}All`]: !all }))}
                  />
                  Apply All
                </label>
              </div>
            )
          })}
        </div>
        <div className='modal-foot' data-comment='coilfilter-foot'>
          <button
            className='btn btn-ghost'
            data-comment='coilfilter-clear'
            onClick={() => setDraft(EMPTY_COIL_FILTER)}
          >
            Clear
          </button>
          <button
            className='btn btn-primary'
            data-comment='coilfilter-apply'
            onClick={() => onApply(draft)}
          >
            Apply
          </button>
        </div>
      </div>
    </Overlay>
  )
}
