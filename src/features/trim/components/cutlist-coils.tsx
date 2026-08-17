import { useState } from 'react'

import { CORE_OD, MAT_THK, type Coil } from '@/store/shared/coils'
import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'
import { DIGITS_DOT, Keypad } from '@/components/shell/keypad'
import { ModalHead, Overlay } from '@/components/shell/modal'

import { setCoilNote, setCoilThickness, trimStore } from '../store'
import { askConfirm, closeConfirm, showToast } from '../ui'

/** «26ga Barn Red» → «Barn Red». The Slinet matches on colour alone (N-109); gauge and width do not. */
export const colorOf = (gaugeColour: string) => gaugeColour.replace(/^\d+ga\s*/i, '').trim()

/** N-166 / Kevin #177: this window's columns move too, and under their own `cadj` key. */
const COLUMNS: Column[] = [
  { key: 'pid', label: 'Product ID' },
  { key: 'width', label: 'Width' },
  { key: 'gauge', label: 'Gauge' },
  { key: 'colour', label: 'Colour' },
  { key: 'num', label: 'Coil #' },
  { key: 'thick', label: 'Thickness' },
  { key: 'lf', label: 'Lin. Ft' },
  { key: 'weight', label: 'Weight' },
  { key: 'note', label: 'Note' }
]

/**
 * The coils a cutlist will actually be cut from, and the one number the Slinet operator changes.
 *
 * Apply stays dark until a thickness is edited, because pushing an unchanged number to EBMS is not a
 * correction — it is noise in someone else's inventory. A thickness of zero is the other case
 * entirely: the coil is spent, and the confirm says so in those words rather than talking about feet.
 */
export const CutlistCoils = ({
  gaugeColour,
  onClose
}: {
  gaugeColour: string | null
  onClose: () => void
}) => {
  const coils = useStore(trimStore, state => state.coils)
  const colour = gaugeColour ? colorOf(gaugeColour) : ''
  const { headers, cells } = useColumnOrder('cadj', COLUMNS, { notify: showToast })

  // what each thickness was when the window opened, so Apply can tell whether anything moved
  const [baseline, setBaseline] = useState<Record<string, number | null>>({})
  const [padCoilId, setPadCoilId] = useState<Coil['id'] | null>(null)
  const [padValue, setPadValue] = useState('')

  const matching = gaugeColour ? coils.filter(coil => coil.slinetIn && coil.color === colour) : []

  // a coil first seen now counts as unchanged: it was not on screen to be edited
  const changed = matching.some(
    coil => coil.id in baseline && (coil.thickness ?? null) !== baseline[coil.id]
  )

  const snapshot = () =>
    setBaseline(Object.fromEntries(matching.map(coil => [coil.id, coil.thickness ?? null])))

  const padCoil = matching.find(coil => coil.id === padCoilId)

  const apply = () => {
    const depleting = matching.filter(coil => coil.thickness === 0)

    if (depleting.length)
      return askConfirm(
        'Deplete & delete coil?',
        'You entered the coil size as 0 — this fully depletes the coil and deletes it. Continue?',
        () => {
          trimStore.set(state => ({
            coils: state.coils.filter(coil => !depleting.some(gone => gone.id === coil.id))
          }))
          closeConfirm()
          showToast(`Depleted & deleted ${depleting.length} coil(s) — zeroed out in EBMS`)
          snapshot()
        }
      )

    askConfirm(
      'Push adjustment to EBMS?',
      'Push the new linear feet amount back to EBMS for the coils in the Slinet?',
      () => {
        closeConfirm()
        showToast('Coil adjustment pushed to EBMS (linear feet updated)')
        snapshot()
      }
    )
  }

  return (
    <>
      <Overlay
        id='overlay-coiladjust'
        comment='overlay-coiladjust'
        open={!!gaugeColour}
        onClose={onClose}
      >
        <div className='modal wide' data-comment='coiladjust-modal' data-component='dialog'>
          <ModalHead
            comment='coiladjust-head'
            titleComment='coiladjust-title'
            descComment='coiladjust-desc'
            title='Cutlist Coils'
            desc={`Coils in the Slinet matching “${colour}” (N-109: Slinet = In + colour match; gauge/width ignored). Adjust, then Apply to push to EBMS.`}
            onClose={onClose}
          />
          <div className='modal-body' id='coiladjust-body' data-comment='coiladjust-body'>
            {!matching.length ? (
              <div
                className='empty'
                data-comment='coiladjust-empty'
                style={{ padding: '36px 12px' }}
              >
                <h3 data-comment='coiladjust-empty-t'>No coil in the Slinet for “{colour}”</h3>
                <p data-comment='coiladjust-empty-p'>
                  Mount a coil of this colour and toggle Slinet = In on the Coils tab to continue
                  this cutlist (N-121).
                </p>
              </div>
            ) : (
              <>
                <table
                  className='sub'
                  data-comment='coiladjust-table'
                  style={{ tableLayout: 'auto' }}
                >
                  <thead>
                    <tr>{headers}</tr>
                  </thead>
                  <tbody>
                    {matching.map(coil => (
                      <tr data-comment={`cadj-row-${coil.id}`} key={coil.id}>
                        {cells({
                          pid: (
                            <td
                              data-col='pid'
                              className='mono'
                              data-comment={`cadj-pid-${coil.id}`}
                            >
                              {coil.productId}
                            </td>
                          ),
                          width: (
                            <td
                              data-col='width'
                              className='mono'
                              data-comment={`cadj-w-${coil.id}`}
                            >
                              {coil.width}&quot;
                            </td>
                          ),
                          gauge: (
                            <td
                              data-col='gauge'
                              className='mono'
                              data-comment={`cadj-g-${coil.id}`}
                            >
                              {coil.gauge}ga
                            </td>
                          ),
                          colour: (
                            <td data-col='colour' data-comment={`cadj-c-${coil.id}`}>
                              {coil.color}
                            </td>
                          ),
                          num: (
                            <td
                              data-col='num'
                              className='mono'
                              data-comment={`cadj-num-${coil.id}`}
                            >
                              {coil.coilNumber}
                            </td>
                          ),
                          thick: (
                            <td data-col='thick' data-comment={`cadj-thick-${coil.id}`}>
                              <button
                                className='thick-btn'
                                data-comment={`cadj-thickbtn-${coil.id}`}
                                onClick={() => {
                                  if (!(coil.id in baseline)) snapshot()
                                  setPadValue('')
                                  setPadCoilId(coil.id)
                                }}
                              >
                                {coil.thickness != null ? `${coil.thickness}"` : '—'}
                              </button>
                            </td>
                          ),
                          lf: (
                            <td data-col='lf' className='mono' data-comment={`cadj-lf-${coil.id}`}>
                              {coil.linearFeet.toLocaleString()}
                            </td>
                          ),
                          weight: (
                            <td
                              data-col='weight'
                              className='mono'
                              data-comment={`cadj-wt-${coil.id}`}
                            >
                              {coil.weight.toLocaleString()}
                            </td>
                          ),
                          note: (
                            <td data-col='note' data-comment={`cadj-note-${coil.id}`}>
                              <input
                                className='coil-note-input'
                                data-comment={`cadj-noteinput-${coil.id}`}
                                defaultValue={coil.note}
                                placeholder='Add note…'
                                onChange={event => setCoilNote(coil.id, event.target.value)}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div
                  className='modal-foot'
                  data-comment='coiladjust-foot'
                  style={{ padding: '16px 0 4px' }}
                >
                  <button
                    className='btn btn-ghost'
                    data-comment='coiladjust-cancel'
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    className='btn btn-primary'
                    data-comment='coiladjust-apply'
                    disabled={!changed}
                    title={changed ? undefined : 'Enter a new Coil Thickness first'}
                    onClick={apply}
                  >
                    Apply
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Overlay>

      <Keypad
        id='overlay-keypad'
        comment='keypad'
        keyComment='keypad-key'
        open={!!padCoil}
        title='Coil thickness'
        desc='Enter thickness in inches'
        keys={DIGITS_DOT}
        display={padValue || String(padCoil?.thickness ?? 0)}
        onPress={key =>
          setPadValue(current => {
            if (key === '⌫') return current.slice(0, -1)
            if (key === '.')
              return current.includes('.') ? current : current === '' ? '0.' : `${current}.`
            return current + key
          })
        }
        onClose={() => setPadCoilId(null)}
        onEnter={() => {
          if (!padCoil) return

          const value = Number.parseFloat(padValue)
          setCoilThickness(
            padCoil.id,
            Number.isNaN(value) ? 0 : value,
            padCoil.materialThickness ?? MAT_THK[padCoil.gauge ?? 0] ?? 0,
            padCoil.coreOD ?? CORE_OD
          )
          setPadCoilId(null)
        }}
      />
    </>
  )
}
