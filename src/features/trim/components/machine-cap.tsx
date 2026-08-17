import { Printer } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { ModalHead, Overlay } from '@/components/shell/modal'

import { fmtDate } from '../format'
import { BENDLIST_MACHINES, dayScheduledTotals, machineTotals } from '../selectors'
import { TODAY, trimStore } from '../store'

/**
 * Pieces have no ceiling, Bends do; Stock is a subset of the figure beside it, never an addition.
 *
 * #219: the canvas writes the stock inside the figure — «20 of the 187 pieces are Stock» — so the
 * column it briefly had of its own (#27) is folded back in as a parenthetical. The alignment that
 * column was asked for is kept a different way: value, slash, max and the parenthetical are four
 * tracks of one fixed grid, so the slashes and the «(n - Stock)» line up down the column anyway.
 */
const Cell = ({
  value,
  max,
  stock,
  comment,
  unrouted
}: {
  value: number
  max?: number
  stock: number
  comment: string
  unrouted?: boolean
}) => (
  <td className='mcap-num' data-comment={comment}>
    <span
      className={`mcap-val${max ? ' has-max' : ''}${max && value > max ? ' over' : ''}${
        unrouted ? ' unrouted' : ''
      }`}
      data-comment={`${comment}-val`}
    >
      <span className='mcap-assigned' data-comment={`${comment}-assigned`}>
        {value}
      </span>
      <span className='mcap-slash' data-comment={`${comment}-slash`}>
        {max ? '/' : ''}
      </span>
      <span className='mcap-max' data-comment={`${comment}-max`}>
        {max ? max : ''}
      </span>
      <span className='mcap-stock' data-comment={`${comment}-stock`}>
        {stock ? `(${stock} - Stock)` : ''}
      </span>
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
  const hasUnrouted = unassigned.pieces > 0 || unassigned.bends > 0

  return (
    <Overlay id='overlay-machinecap' comment='overlay-machinecap' open={!!day} onClose={onClose}>
      <div
        className='modal'
        style={{ maxWidth: '640px' }}
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
          {/*
            #218: the canvas carries the date once, in the day's own row. The centred label that used to
            repeat it directly above the same date is gone with its `mcap-daylabel` anchor.
          */}
          <table className='mcap-table' data-comment='mcap-table'>
            <thead>
              <tr>
                <th data-comment='mcap-th-blank' />
                {/* #219: the canvas's own two headings — the stock figure lives inside each of them */}
                <th data-comment='mcap-th-pieces'>Total # of Pieces</th>
                <th data-comment='mcap-th-bends'>Total Bends / Daily Max.</th>
              </tr>
            </thead>
            <tbody data-comment='mcap-tbody'>
              <tr className='mcap-dayrow' data-comment='mcap-row-day'>
                <th scope='row' data-comment='mcap-name-day'>
                  {fmtDate(iso)}
                  {iso === TODAY ? <span className='subtle'> · today</span> : null}
                </th>
                {/*
                  #216: the day's own figures turn orange while any of the day's trim still has no
                  machine — the gap between this row and the machine rows below it. Over the daily max
                  keeps the red it already had; that is the harder warning of the two.
                */}
                <Cell
                  value={scheduled.pieces}
                  stock={scheduled.stockPieces}
                  comment='mcap-daypieces'
                  unrouted={hasUnrouted}
                />
                <Cell
                  value={scheduled.bends}
                  max={dailyMax}
                  stock={scheduled.stockBends}
                  comment='mcap-daybends'
                  unrouted={hasUnrouted}
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
