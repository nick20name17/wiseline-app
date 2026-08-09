import { useState } from 'react'

import type { Coil } from '@/store/shared/coils'

import { ModalHead, Overlay } from '@/components/shell/modal'

import {
  ADJUST_FIELDS,
  applyCoilAdjust,
  COIL_USAGE,
  coilLfFromThickness,
  coilLfFromWeight,
  coilThicknessFromLf,
  coilWeightFromLf,
  EMPTY_COIL_FILTER,
  setCoilSetup,
  type AdjustField,
  type CoilFilter
} from './store'

const num = (value: number) => value.toLocaleString()

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

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

/**
 * The Coil Adjustment window: a keypad over three fields that are one measurement in three units.
 *
 * Material Thickness and Core OD gate everything else — without both, the coil's geometry is unknown,
 * so Coil Thickness stays blank and neither Linear Feet nor Weight can be adjusted. Those two write
 * straight to the coil as they are typed, exactly as the prototype does; the keypad's value does not,
 * because it is pushed to EBMS and so goes through a confirm.
 */
export const AdjustModal = ({
  coil,
  onClose,
  onConfirm
}: {
  coil: Coil | null
  onClose: () => void
  onConfirm: (question: { title: string; desc: string; onOk: () => void }) => void
}) => {
  const [field, setField] = useState<AdjustField>('thickness')
  const [value, setValue] = useState('')

  const matThk = coil?.materialThickness ?? NaN
  const coreOD = coil?.coreOD ?? NaN
  const gate = !isNaN(matThk) && matThk > 0 && !isNaN(coreOD) && coreOD > 0

  const pickField = (next: AdjustField) => {
    if (!gate || !coil) return
    setField(next)
    const current =
      next === 'thickness' ? coil.thickness : next === 'linearFeet' ? coil.linearFeet : coil.weight
    setValue(current != null ? String(current) : '')
  }

  const press = (key: string) => {
    if (!gate) return
    if (key === '⌫') setValue(current => current.slice(0, -1))
    else if (key === '.' && value.includes('.')) return
    else setValue(current => current + key)
  }

  const apply = () => {
    const parsed = parseFloat(value)
    if (!coil || !gate || isNaN(parsed)) return

    const linearFeet =
      field === 'thickness'
        ? coilLfFromThickness(parsed, matThk, coreOD)
        : field === 'weight'
          ? coilLfFromWeight(parsed, coil.width, matThk)
          : Math.round(parsed)
    const thickness =
      field === 'thickness' ? parsed : coilThicknessFromLf(linearFeet, matThk, coreOD)
    const weight =
      field === 'weight' ? Math.round(parsed) : coilWeightFromLf(linearFeet, coil.width, matThk)

    if (linearFeet <= 0) {
      onConfirm({
        title: 'Deplete & delete coil?',
        desc: `This zeroes out coil ${coil.coilNumber} in EBMS and deletes it from the app. This can't be undone.`,
        onOk: () => applyCoilAdjust(coil.id, { thickness, linearFeet, weight })
      })
      return
    }

    onConfirm({
      title: 'Push updated linear feet to EBMS?',
      desc: `Coil ${coil.coilNumber} → ${thickness}" thick, ${num(linearFeet)} ft, ${num(weight)} lb. Push to EBMS?`,
      onOk: () => applyCoilAdjust(coil.id, { thickness, linearFeet, weight })
    })
  }

  return (
    <Overlay id='overlay-adjust' comment='overlay-adjust' open={!!coil} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '840px' }}
        data-comment='adjust-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='adjust-head'
          titleComment='adjust-title'
          descComment='adjust-desc'
          title={coil ? `Adjust coil ${coil.coilNumber}` : 'Adjust coil'}
          desc='Enter Coil Thickness, Linear Feet or Weight — the others recompute automatically.'
          onClose={onClose}
        />
        <div className='modal-body' data-comment='adjust-body'>
          <div id='adjust-coiltable' data-comment='adjust-coiltable'>
            {coil ? (
              <div className='coil-adjust-tablewrap' data-comment='adjust-coiltable-wrap'>
                <table
                  className='coil-adjust-table'
                  data-comment='adjust-coiltable-tbl'
                  data-component='table'
                >
                  <thead>
                    <tr>
                      <th>Product ID</th>
                      <th>Width</th>
                      <th>Gauge</th>
                      <th>Color</th>
                      <th>Coil #</th>
                      <th>Coil Thickness</th>
                      <th>Linear Feet</th>
                      <th>Weight</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr data-comment='adjust-coilrow'>
                      <td className='mono-cell'>{coil.productId}</td>
                      <td className='mono-cell'>{coil.width}"</td>
                      <td className='mono-cell'>{coil.gauge}ga</td>
                      <td>{coil.color}</td>
                      <td className='mono-cell'>{coil.coilNumber}</td>
                      <td className='mono-cell'>
                        {coil.thickness != null ? (
                          `${coil.thickness}"`
                        ) : (
                          <span className='subtle'>—</span>
                        )}
                      </td>
                      <td className='mono-cell'>{num(coil.linearFeet)}</td>
                      <td className='mono-cell'>{num(coil.weight)}</td>
                      <td>{coil.note ? coil.note : <span className='subtle'>—</span>}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div id='adjust-setup' data-comment='adjust-setup'>
            <div className='setup-row' data-comment='adjust-setup-row'>
              <div
                className='field'
                data-comment='adjust-field-mt'
                style={{ flex: 1, marginBottom: 0 }}
              >
                <label className='field-label' data-comment='adjust-field-mt-label'>
                  Material thickness (in)
                </label>
                <input
                  type='number'
                  step='0.001'
                  className='input mono'
                  data-comment='adjust-field-mt-input'
                  placeholder='e.g. 0.018'
                  value={coil?.materialThickness ?? ''}
                  onChange={event =>
                    coil &&
                    setCoilSetup(coil.id, {
                      materialThickness: event.target.value === '' ? null : +event.target.value
                    })
                  }
                />
              </div>
              <div
                className='field'
                data-comment='adjust-field-od'
                style={{ flex: 1, marginBottom: 0 }}
              >
                <label className='field-label' data-comment='adjust-field-od-label'>
                  Core OD (in)
                </label>
                <input
                  type='number'
                  step='0.1'
                  className='input mono'
                  data-comment='adjust-field-od-input'
                  placeholder='e.g. 3'
                  value={coil?.coreOD ?? ''}
                  onChange={event =>
                    coil &&
                    setCoilSetup(coil.id, {
                      coreOD: event.target.value === '' ? null : +event.target.value
                    })
                  }
                />
              </div>
            </div>
            {gate ? null : (
              <div className='gate-note' data-comment='adjust-gate-note'>
                Coil Thickness stays blank, and Linear Feet / Weight can't be adjusted, until both
                fields above are set.
              </div>
            )}
          </div>

          <div className='adjust-info' id='adjust-info' data-comment='adjust-info'>
            <div className='adjust-info-item' data-comment='adjust-info-lf'>
              <div className='adjust-info-label' data-comment='adjust-info-lf-label'>
                Current Lin. Ft
              </div>
              <div className='adjust-info-value' data-comment='adjust-info-lf-value'>
                {coil ? num(coil.linearFeet) : ''}
              </div>
            </div>
            <div className='adjust-info-item' data-comment='adjust-info-weight'>
              <div className='adjust-info-label' data-comment='adjust-info-weight-label'>
                Current weight
              </div>
              <div className='adjust-info-value' data-comment='adjust-info-weight-value'>
                {coil ? num(coil.weight) : ''}
              </div>
            </div>
            <div className='adjust-info-item' data-comment='adjust-info-thick'>
              <div className='adjust-info-label' data-comment='adjust-info-thick-label'>
                Current thickness
              </div>
              <div className='adjust-info-value' data-comment='adjust-info-thick-value'>
                {coil?.thickness != null ? `${coil.thickness}"` : '—'}
              </div>
            </div>
          </div>

          <div id='adjust-fieldselect' data-comment='adjust-fieldselect'>
            <div className='field-select' data-comment='adjust-fieldselect-row'>
              {ADJUST_FIELDS.map(entry => (
                <button
                  className={`subtab ${field === entry.key ? 'active' : ''}`}
                  data-comment={`adjust-field-btn-${entry.key}`}
                  disabled={!gate}
                  onClick={() => pickField(entry.key)}
                  key={entry.key}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className='keypad-display mono' id='adjust-display' data-comment='adjust-display'>
            {gate ? value || '0' : '—'}
          </div>

          <div className='keypad-grid' id='adjust-keypad' data-comment='adjust-keypad'>
            {KEYS.map((key, index) => (
              <button
                className='keypad-key'
                data-comment={`adjust-key-${index}`}
                disabled={!gate}
                onClick={() => press(key)}
                key={key}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
        <div className='modal-foot' data-comment='adjust-foot'>
          <button className='btn btn-ghost' data-comment='adjust-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            id='adjust-apply'
            data-comment='adjust-apply'
            disabled={!gate || value === '' || isNaN(parseFloat(value))}
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
                <input
                  type='number'
                  step={leg.step}
                  className='cf-input mono'
                  data-comment={`coilfilter-${leg.key}-min`}
                  aria-label={`${leg.label} min`}
                  placeholder='0'
                  value={draft[`${leg.key}Min`]}
                  disabled={all}
                  onChange={event =>
                    setDraft(current => ({ ...current, [`${leg.key}Min`]: event.target.value }))
                  }
                />
                <span className='cf-amp'>&amp;</span>
                <input
                  type='number'
                  step={leg.step}
                  className='cf-input mono'
                  data-comment={`coilfilter-${leg.key}-max`}
                  aria-label={`${leg.label} max`}
                  placeholder='No limit'
                  value={draft[`${leg.key}Max`]}
                  disabled={all}
                  onChange={event =>
                    setDraft(current => ({ ...current, [`${leg.key}Max`]: event.target.value }))
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
