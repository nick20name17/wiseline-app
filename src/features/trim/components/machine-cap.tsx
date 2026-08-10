import { Printer } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate } from '../format'
import { BENDLIST_MACHINES, dayScheduledTotals, machineTotals } from '../selectors'
import { TODAY, trimStore } from '../store'

/** Pieces have no ceiling, Bends do; Stock is a subset of the figure beside it, never an addition. */
const Cell = ({
  value,
  max,
  stock,
  comment
}: {
  value: number
  max?: number
  stock: number
  comment: string
}) => (
  <td className='mcap-num' data-comment={comment}>
    <span
      className={`mcap-val${max && value > max ? ' over' : ''}`}
      data-comment={`${comment}-val`}
    >
      {value}
      {max ? ` / ${max}` : ''}
    </span>
    <span className='mcap-stock' data-comment={`${comment}-stock`}>
      ({stock} - Stock)
    </span>
  </td>
)

/**
 * #174: one production day, read-only.
 *
 * The top row is everything the day has scheduled; the machine rows are only what has been routed to
 * a machine. The two are deliberately not the same number — the gap is trim with a day and no machine
 * yet, and summing the machines instead would hide exactly the work nobody has claimed.
 *
 * Daily maxes are not set here. They belong to Settings › Machines, and a report that let you edit its
 * own limits would be a second place for them to disagree.
 */
export const MachineCap = ({ day, onClose }: { day: string | null; onClose: () => void }) => {
  const state = useStore(trimStore, current => current)
  const iso = day && day !== 'all' ? day : TODAY

  const rows = BENDLIST_MACHINES.map(machine => ({
    machine,
    totals: machineTotals(machine.id, iso, state)
  }))
  const sum = (pick: (totals: (typeof rows)[number]['totals']) => number) =>
    rows.reduce((total, row) => total + pick(row.totals), 0)

  const scheduled = dayScheduledTotals(iso, state.orders)
  const dailyMax = sum(totals => totals.dailyMax)
  const unassigned = {
    pieces: scheduled.pieces - sum(totals => totals.pieces),
    bends: scheduled.bends - sum(totals => totals.bends)
  }

  return (
    <Overlay id='overlay-machinecap' comment='overlay-machinecap' open={!!day} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '600px' }}
        data-comment='machinecap-modal'
        data-component='dialog'
      >
        <ModalHead
          comment='machinecap-head'
          titleComment='machinecap-title'
          descComment='machinecap-desc'
          title='Machine Capacities'
          desc='Report · what this production day has assigned to each machine. Over the daily max is a soft warning — it highlights, never blocks.'
          onClose={onClose}
        />
        <div
          className='modal-body'
          id='machinecap-body'
          data-comment='machinecap-body'
          style={{ paddingBottom: '18px' }}
        >
          <div className='mcap-daylabel' data-comment='mcap-daylabel'>
            {fmtDate(iso)}
            {iso === TODAY ? ' · today' : ''}
          </div>

          <table className='mcap-table' data-comment='mcap-table'>
            <thead>
              <tr>
                <th data-comment='mcap-th-blank' />
                <th data-comment='mcap-th-pieces'>Pieces</th>
                <th data-comment='mcap-th-bends'>Bends</th>
              </tr>
            </thead>
            <tbody data-comment='mcap-tbody'>
              <tr className='mcap-dayrow' data-comment='mcap-row-day'>
                <th scope='row' data-comment='mcap-name-day'>
                  {fmtDate(iso)}
                </th>
                <Cell
                  value={scheduled.pieces}
                  stock={scheduled.stockPieces}
                  comment='mcap-daypieces'
                />
                <Cell
                  value={scheduled.bends}
                  max={dailyMax}
                  stock={scheduled.stockBends}
                  comment='mcap-daybends'
                />
              </tr>
              {rows.map(({ machine, totals }) => (
                <tr data-comment={`mcap-row-${machine.id}`} key={machine.id}>
                  <th scope='row' data-comment={`mcap-name-${machine.id}`}>
                    {machine.name}
                  </th>
                  <Cell
                    value={totals.pieces}
                    stock={totals.stockPieces}
                    comment={`mcap-pieces-${machine.id}`}
                  />
                  <Cell
                    value={totals.bends}
                    max={totals.dailyMax}
                    stock={totals.stockBends}
                    comment={`mcap-bends-${machine.id}`}
                  />
                </tr>
              ))}
            </tbody>
          </table>

          <p className='mcap-note' data-comment='mcap-note'>
            The top row is everything scheduled for the day; the machine rows are what has been
            assigned to each machine
            {unassigned.bends > 0 ? (
              <>
                {' — '}
                <b>{unassigned.bends} bends</b> ({unassigned.pieces} pcs) are scheduled but not
                routed to a machine yet
              </>
            ) : null}
            . Stock figures are part of the totals, not additional — they come only from Stock
            Orders. Daily maxes are set in Settings › Machines.
          </p>

          <div className='mcap-actions mcap-print-hide' data-comment='mcap-actions'>
            <button
              className='btn btn-primary'
              data-comment='mcap-print'
              onClick={() => {
                // the print sheet drops the app chrome; the class goes beside `data-page`, which the
                // print stylesheet is scoped to — on `#root`, the port's stand-in for the body
                const root = document.getElementById('root')
                root?.classList.add('is-printing-report')
                const cleanup = () => {
                  root?.classList.remove('is-printing-report')
                  window.removeEventListener('afterprint', cleanup)
                }
                window.addEventListener('afterprint', cleanup)
                window.print()
              }}
            >
              <Printer style={{ width: '14px', height: '14px' }} />
              Print
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}
