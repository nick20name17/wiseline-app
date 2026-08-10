import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { rollformingStore } from '../store'

/**
 * One picker, two callers: the Assign modal fills its field, the Queue assigns the row directly. The
 * caller says what to do with the number, which is the only thing that differs.
 */
export type CoilPickCtx = {
  mode: 'assign' | 'queue'
  color: string
  gauge: number
  onPick: (coilNumber: string) => void
}

export const CoilPickModal = ({
  ctx,
  onClose
}: {
  ctx: CoilPickCtx | null
  onClose: () => void
}) => {
  const coils = useStore(rollformingStore, state => state.coils)
  const matches = ctx
    ? coils.filter(coil => coil.color === ctx.color && coil.gauge === ctx.gauge)
    : []

  return (
    <Overlay id='overlay-coilpick' comment='overlay-coilpick' open={!!ctx} onClose={onClose}>
      <div className='modal wide' data-comment='coilpick-modal' data-component='dialog'>
        <ModalHead
          comment='coilpick-head'
          titleComment='coilpick-title'
          descComment='coilpick-desc'
          title={ctx ? `Select Coil Number · ${ctx.color} · ${ctx.gauge}ga` : 'Select Coil Number'}
          desc="EBMS Product IDs with Production Type = Coil, matching this line item's Colour & Gauge."
          onClose={onClose}
        />
        <div className='modal-body' id='coilpick-body' data-comment='coilpick-body'>
          {!matches.length ? (
            <div className='empty' data-comment='coilpick-empty' style={{ padding: '36px 12px' }}>
              <h3 data-comment='coilpick-empty-t'>No matching coil</h3>
              <p data-comment='coilpick-empty-p'>
                No EBMS Product ID with Production Type = Coil matches {ctx?.color} · {ctx?.gauge}
                ga.
              </p>
            </div>
          ) : (
            <table
              className='sub'
              data-comment='coilpick-table'
              data-component='table'
              style={{ tableLayout: 'auto' }}
            >
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Colour</th>
                  <th>Gauge</th>
                  <th>Width</th>
                  <th>Coil #</th>
                  <th>On Hand</th>
                </tr>
              </thead>
              <tbody data-comment='coilpick-tbody'>
                {matches.map((coil, index) => (
                  <tr
                    key={coil.id}
                    data-comment={`coilpick-row-${index}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      ctx?.onPick(coil.coilNumber)
                      onClose()
                    }}
                  >
                    <td className='mono' data-comment={`coilpick-pid-${index}`}>
                      {coil.productId}
                    </td>
                    <td data-comment={`coilpick-color-${index}`}>{coil.color}</td>
                    <td className='mono' data-comment={`coilpick-gauge-${index}`}>
                      {coil.gauge}ga
                    </td>
                    <td className='mono' data-comment={`coilpick-width-${index}`}>
                      {coil.width}&quot;
                    </td>
                    <td className='mono' data-comment={`coilpick-num-${index}`}>
                      {coil.coilNumber}
                    </td>
                    <td className='mono' data-comment={`coilpick-onhand-${index}`}>
                      {coil.onHand.toLocaleString()} ln ft
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Overlay>
  )
}
