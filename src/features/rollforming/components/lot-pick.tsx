import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { rollformingStore, setQueueLotNumber } from '../store'

export type LotPickCtx = { groupKey: string; color: string; gauge: number; coilNumber: string }

/**
 * The lots a coil arrived in. One coil number can cover several, and the floor needs the one it is
 * actually rolling — so the pick goes into the Coil Number field rather than beside it.
 */
export const LotPickModal = ({ ctx, onClose }: { ctx: LotPickCtx | null; onClose: () => void }) => {
  const coils = useStore(rollformingStore, state => state.coils)

  const meta = ctx
    ? (coils.find(coil => coil.coilNumber === ctx.coilNumber) ??
      coils.find(coil => coil.color === ctx.color && coil.gauge === ctx.gauge))
    : undefined
  const lots = meta ? [meta.lotNumber, `${meta.lotNumber}-B`, `${meta.lotNumber}-C`] : ['LOT-4400']

  return (
    <Overlay id='overlay-lot' comment='overlay-lot' open={!!ctx} onClose={onClose}>
      <div className='modal' data-comment='lot-modal' data-component='dialog'>
        <ModalHead
          comment='lot-head'
          titleComment='lot-title'
          descComment='lot-desc'
          title={ctx ? `Lot Numbers · ${ctx.color} · ${ctx.gauge}ga` : 'Lot Numbers'}
          desc='Lot Numbers connected to the coil on this row.'
          onClose={onClose}
        />
        <div className='modal-body' id='lot-body' data-comment='lot-body'>
          <table
            className='sub'
            data-comment='lot-table'
            data-component='table'
            style={{ tableLayout: 'auto' }}
          >
            <thead>
              <tr>
                <th>Lot Number</th>
              </tr>
            </thead>
            <tbody data-comment='lot-tbody'>
              {lots.map((lot, index) => (
                <tr
                  key={lot}
                  data-comment={`lot-row-${index}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (ctx) setQueueLotNumber(ctx.groupKey, lot)
                    onClose()
                  }}
                >
                  <td className='mono' data-comment={`lot-num-${index}`}>
                    {lot}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Overlay>
  )
}
