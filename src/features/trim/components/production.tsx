import {
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  History,
  Layers,
  MessageSquare,
  PackagePlus,
  RefreshCw,
  Warehouse
} from 'lucide-react'

import { Link } from '@tanstack/react-router'

import { Fragment, useEffect, useState } from 'react'

import { useStore } from '@/store/create-store'

import { usePopover } from '@/components/shell/pop'

import { fmtDate, fmtStamp } from '../format'
import {
  BENDLIST_MACHINES,
  computeBatches,
  groupStepState,
  isOverdue,
  MACHINE_TABS,
  machineById,
  machineTotals,
  noteState,
  priorityById,
  qtyToMake,
  RANK,
  remanBendlistEntries,
  remanCutlistEntries,
  remanIsStock,
  slinetTotals,
  ventedOf,
  type BatchItem
} from '../selectors'
import {
  machineCompleteGroup,
  markBatchDone,
  reassignMachine,
  revertRowComplete,
  setActiveMachine,
  setOpNote,
  setProdListMode,
  setProdMode,
  slinetCutGroup,
  TODAY,
  toggleBatchExpand,
  trimStore
} from '../store'
import {
  askConfirm,
  askRemanFlag,
  askRemanListDone,
  closeConfirm,
  openCutlistCoils,
  openCutlistTotal,
  openNotes,
  openPad,
  showToast
} from '../ui'
import { DrawingThumb, EmptyState } from './bits'
import { StockMfg } from './stock-mfg'
import { Wrapping } from './wrapping'

import type { Reman } from '../types'

/**
 * #190/#213: a Stock mark so a worker can tell at a glance whether the list in front of them is
 * customer work or stock. It sits at the end of the Gauge/Colour column, not on the date — the day
 * divider owns the date now.
 */
const StockIco = ({ comment, title }: { comment: string; title?: string }) => (
  <span className='stock-ico' data-comment={comment} title={title || 'Stock order'}>
    <Warehouse style={{ width: '13px', height: '13px' }} />
  </span>
)

const PRODUCTION_STATUS: Record<string, [string, string]> = {
  stock: ['st-stock', 'Stock'],
  not_started: ['st-notstarted', 'Not Started'],
  in_progress: ['st-inprogress', 'In Progress'],
  cut: ['st-cut', 'Cut'],
  bent: ['st-bent', 'Bent'],
  wrapped: ['st-wrapped', 'Wrapped'],
  bypassed: ['st-bypassed', 'Bypassed']
}

const ProdStatusPill = ({ status, comment }: { status: string | null; comment: string }) => {
  const [cls, label] = PRODUCTION_STATUS[status ?? ''] ?? PRODUCTION_STATUS.not_started!

  return (
    <span className={`status ${cls}`} data-comment={comment}>
      <span className='st-dot' />
      {label}
    </span>
  )
}

/**
 * #214: the one Recut/Remanufacture cell in a reman head, so it carries the provenance that used to
 * live in a separate tag's tooltip.
 */
const RemanCell = ({
  label,
  qty,
  green,
  comment,
  note
}: {
  label: string
  qty: number
  green: boolean
  comment: string
  note?: string
}) => (
  <span
    className={`rework-badge ${green ? 'rework-done' : 'rework-pending'}`}
    data-comment={comment}
    title={`${label}${green ? ' complete' : ' outstanding'}${note ? ` · ${note}` : ''}`}
  >
    <RefreshCw style={{ width: '14px', height: '14px' }} />
    {qty}
  </span>
)

/**
 * #215: deliberately no pieces or bends on the divider. The totals strip counts everything the day put
 * on this machine, lists already Done included — capacity was still consumed — while the list below
 * holds only the active ones. Two different populations on one screen would read as a bug.
 */
const DaySep = ({
  date,
  first,
  count,
  listWord,
  pfx
}: {
  date: string
  first: boolean
  count: number
  listWord: string
  pfx: string
}) => (
  <div className={`day-sep${first ? ' is-first' : ''}`} data-comment={`prod-daysep-${pfx}${date}`}>
    <span data-comment={`prod-daysep-label-${pfx}${date}`}>
      {fmtDate(date)}
      {date === TODAY ? <span className='subtle'> · today</span> : null}
    </span>
    <span className='day-count' data-comment={`prod-daysep-count-${pfx}${date}`}>
      {count} {listWord}
      {count > 1 ? 's' : ''}
    </span>
  </div>
)

/**
 * #208: the production controls, frozen at the top of the scrollport.
 *
 * Its height is published as `--freeze-h` rather than hard-coded, because the day dividers park
 * directly under it and the bar is a different height on the Wrapping tab, in Stock mode, and
 * whenever the machine tabs wrap to a second line.
 */
const FreezeBar = ({ children }: { children: React.ReactNode }) => {
  const [node, setNode] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    // the var goes on the parent, not on the bar: the day dividers that read it are its siblings
    const host = node?.parentElement
    if (!node || !host) return
    const publish = () => host.style.setProperty('--freeze-h', `${node.offsetHeight}px`)
    const observer = new ResizeObserver(publish)
    observer.observe(node)
    publish()
    return () => {
      observer.disconnect()
      host.style.removeProperty('--freeze-h')
    }
  }, [node])

  return (
    <div className='prod-freeze' data-comment='prod-freeze' ref={setNode}>
      {children}
    </div>
  )
}

const MachineTotals = ({ machineId, slinet }: { machineId: number | null; slinet?: boolean }) => {
  const state = useStore(trimStore, current => current)
  const totals = slinet ? slinetTotals(TODAY, state) : machineTotals(machineId, TODAY, state)
  const over = !slinet && totals.bends > totals.dailyMax
  const stockNote = (value: number) => (value ? ` (${value} of them from stock orders)` : '')
  const where = slinet ? 'Cut on the Slinet today' : 'Assigned to this machine for today'

  return (
    <div className='mach-totals' data-comment='prod-mtotals'>
      <div className='mach-total-day' data-comment='prod-mtotal-day'>
        <CalendarCheck style={{ width: '14px', height: '14px' }} />
        {fmtDate(TODAY)} <span className='subtle'>· today</span>
      </div>
      <div className='mach-total-item' data-comment='prod-mtotal-pieces'>
        <span className='mach-total-label'>Total # Pieces</span>
        <span className='mach-total-value mono' title={`${where}${stockNote(totals.stockPieces)}`}>
          {totals.pieces}
        </span>
      </div>
      {/*
        #209: the Slinet cuts, it does not bend — so neither Total Bends nor the daily max it has none
        of belong on its strip. Pieces to cut is the whole figure there.
      */}
      {slinet ? null : (
        <>
          <div className='mach-total-item' data-comment='prod-mtotal-bends'>
            <span className='mach-total-label'>Total Bends</span>
            <span
              className={`mach-total-value mono ${over ? 'over' : ''}`}
              title={`${where}${stockNote(totals.stockBends)}${over ? ' — over the daily max' : ''}`}
            >
              {totals.bends}
            </span>
          </div>
          <div className='mach-total-item' data-comment='prod-mtotal-max'>
            <span className='mach-total-label'>Daily Max (bends)</span>
            <span className='mach-total-value mono' title='Set in Settings › Machines'>
              {totals.dailyMax}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

const SLINET_COLUMNS = (
  <>
    <th style={{ width: '54px' }}>W&quot;</th>
    <th style={{ width: '54px' }}>L&quot;</th>
    <th style={{ width: '64px' }}>Total</th>
    <th style={{ width: '52px' }} title='Press Brake'>
      P.B.
    </th>
    <th style={{ width: '48px' }}>V1</th>
    <th style={{ width: '48px' }}>V2</th>
    <th style={{ width: '70px' }}>Rollformer</th>
    <th style={{ width: '64px' }}>Vented</th>
    <th style={{ width: '52px' }}>Caps</th>
    <th style={{ width: '78px' }}>Flat Stock</th>
    <th style={{ width: '150px' }}>Operator Notes</th>
    <th style={{ width: '96px' }}>Complete</th>
  </>
)

/** N-054: ticking is silent, unticking asks — reopening a row is undoing someone's sign-off. */
const CompleteToggle = ({
  comment,
  done,
  disabled,
  title,
  onToggle
}: {
  comment: string
  done: boolean
  disabled: boolean
  title: string
  onToggle: (toYes: boolean) => void
}) => (
  <label className='complete-toggle' data-comment={`prod-complete-${comment}`} title={title}>
    <input
      type='checkbox'
      className='chk'
      data-comment={`prod-completechk-${comment}`}
      checked={done}
      disabled={disabled}
      onChange={() => onToggle(!done)}
    />
    <span className='complete-yn'>{done ? 'Yes' : 'No'}</span>
  </label>
)

/**
 * N-111: identical rows — same width × length, and on a machine tab the same machine — consolidate
 * into one Total row. This is display only; the cutlist grouping key (date × gauge/colour × priority)
 * is untouched.
 */
const rowGroupsOf = (items: BatchItem[], isSlinet: boolean) => {
  const groups: { width: number; length: number; machineId: number | null; items: BatchItem[] }[] =
    []
  const index = new Map<string, number>()

  for (const item of items) {
    // §194: Slinet groups by size alone — the per-machine split is shown as columns instead
    const key = isSlinet
      ? `${item.width}|${item.length}`
      : `${item.width}|${item.length}|${item.machineId ?? ''}`
    let at = index.get(key)
    if (at === undefined) {
      at = groups.length
      index.set(key, at)
      groups.push({ width: item.width, length: item.length, machineId: item.machineId, items: [] })
    }
    groups[at]!.items.push(item)
  }

  return groups.sort((a, b) => a.width - b.width || a.length - b.length)
}

const BatchRows = ({
  batchId,
  batchKey,
  items,
  isSlinet,
  stepStatus
}: {
  batchId: string
  batchKey: string
  items: BatchItem[]
  isSlinet: boolean
  stepStatus: string
}) => {
  const { openPop, popNode } = usePopover()
  const opNotes = useStore(trimStore, state => state.opNotes)

  return (
    <>
      {popNode}
      {rowGroupsOf(items, isSlinet).map((group, groupIndex) => {
        const gitems = group.items
        const solo = gitems.length === 1
        const first = gitems[0]!
        const rowKey = `${batchKey}-${groupIndex}`
        const state = groupStepState(gitems, RANK[stepStatus]!)
        const done = state === 'done'

        // N-112/127: Total is the full qty to manufacture; a machine column is the non-vented remainder
        const totalQty = gitems.reduce((sum, item) => sum + qtyToMake(item), 0)
        const totalOrdered = gitems.reduce((sum, item) => sum + item.qty, 0)
        const totalVented = gitems.reduce((sum, item) => sum + ventedOf(item), 0)
        const totalFlat = gitems.reduce((sum, item) => sum + (item.fromStock || 0), 0)

        const pidSet = [...new Set(gitems.map(item => item.productId))]
        const descSet = [...new Set(gitems.map(item => item.description))]
        const lenAlert = group.length !== 120
        // on a machine tab a row cannot be completed before the Slinet has cut it
        const eligible =
          isSlinet ||
          !(state === 'none' && gitems.every(item => !item.status || item.status === 'not_started'))

        const machineCount = (name: string) => {
          const machine = BENDLIST_MACHINES.find(candidate => candidate.name === name)!
          const count = gitems
            .filter(item => item.machineId === machine.id)
            .reduce((sum, item) => sum + (qtyToMake(item) - ventedOf(item)), 0)
          return { machine, count }
        }

        const totalLink = (
          <button
            className='total-link'
            data-comment={`prod-i-qtybtn-${rowKey}`}
            title='See orders using this size'
            onClick={event => {
              event.stopPropagation()
              openCutlistTotal(gitems)
            }}
          >
            {totalQty}
          </button>
        )

        const refs = gitems.map(item => ({ orderId: item.orderId, lineId: item.id }))

        const completeCell = (
          <CompleteToggle
            comment={rowKey}
            done={done}
            disabled={!eligible && !done}
            title={
              done
                ? 'Marked complete — uncheck to reopen (asks first)'
                : eligible
                  ? 'Mark this row complete'
                  : 'Waiting on Slinet cut'
            }
            onToggle={toYes => {
              if (toYes)
                return isSlinet ? slinetCutGroup(batchId, refs) : machineCompleteGroup(refs)

              askConfirm(
                'Mark this row as NOT completed?',
                'Are you sure you want to mark this row as NOT completed?',
                () => {
                  closeConfirm()
                  revertRowComplete(refs, isSlinet)
                },
                'Yes',
                'No'
              )
            }}
          />
        )

        return (
          <tr
            key={rowKey}
            className={done ? 'row-complete' : ''}
            data-comment={`prod-row-${rowKey}`}
          >
            <td className='mono' data-comment={`prod-i-w-${rowKey}`}>
              {group.width.toFixed(1)}
            </td>
            <td
              className={`mono ${lenAlert ? 'len-alert' : ''}`}
              data-comment={`prod-i-l-${rowKey}`}
            >
              {group.length}&quot;
            </td>

            {isSlinet ? (
              <>
                <td className='mono' data-comment={`prod-i-qty-${rowKey}`}>
                  {totalLink}
                </td>
                {['Press Brake', 'V1', 'V2', 'Rollformer'].map(name => {
                  const { machine, count } = machineCount(name)
                  return (
                    <td
                      key={machine.id}
                      className='mono'
                      data-comment={`prod-i-m${machine.id}-${rowKey}`}
                    >
                      {count ? count : <span className='subtle'>—</span>}
                    </td>
                  )
                })}
                <td className='mono' data-comment={`prod-i-vent-${rowKey}`}>
                  {totalVented ? (
                    <span className='vent-pill'>{totalVented}</span>
                  ) : (
                    <span className='subtle'>—</span>
                  )}
                </td>
                {(() => {
                  const { machine, count } = machineCount('Caps')
                  return (
                    <td className='mono' data-comment={`prod-i-m${machine.id}-${rowKey}`}>
                      {count ? count : <span className='subtle'>—</span>}
                    </td>
                  )
                })()}
                <td
                  className='mono'
                  data-comment={`prod-i-flat-${rowKey}`}
                  title='Pieces cut for flat stock during this cut (N-116)'
                >
                  {totalFlat ? totalFlat : <span className='subtle'>—</span>}
                </td>
                <td data-comment={`prod-i-op-${rowKey}`}>
                  <input
                    className='op-note'
                    type='text'
                    data-comment={`prod-opnote-${rowKey}`}
                    placeholder='Notes…'
                    value={opNotes[rowKey] ?? ''}
                    onChange={event => setOpNote(rowKey, event.target.value)}
                    onClick={event => event.stopPropagation()}
                  />
                </td>
                <td data-comment={`prod-i-complete-${rowKey}`}>{completeCell}</td>
              </>
            ) : (
              <>
                <td className='mono' data-comment={`prod-i-ordqty-${rowKey}`}>
                  {totalOrdered}
                </td>
                <td data-comment={`prod-i-stock-${rowKey}`}>
                  {done || !solo ? (
                    <span className='mono'>{totalFlat}</span>
                  ) : (
                    <button
                      className='field-btn'
                      style={{ minWidth: '52px', justifyContent: 'center' }}
                      data-comment={`prod-stockbtn-${rowKey}`}
                      onClick={event => {
                        event.stopPropagation()
                        openPad({
                          kind: 'stock',
                          orderId: first.orderId,
                          lineId: first.id,
                          locked: first.status === 'wrapped'
                        })
                      }}
                    >
                      {first.fromStock || 0}
                    </button>
                  )}
                </td>
                <td className='mono' data-comment={`prod-i-qty-${rowKey}`}>
                  {totalLink}
                </td>
                <td className='mono' data-comment={`prod-i-pid-${rowKey}`}>
                  {pidSet.length === 1 ? pidSet[0] : 'Multiple'}
                </td>
                <td className='trunc' data-comment={`prod-i-desc-${rowKey}`}>
                  {descSet.length === 1 ? descSet[0] : 'Multiple'}
                </td>
                <td data-comment={`prod-i-remc-${rowKey}`}>
                  {solo ? (
                    done ? (
                      <span
                        className='subtle'
                        data-comment={`prod-i-rem-${rowKey}`}
                        style={{ fontSize: '11px' }}
                      >
                        —
                      </span>
                    ) : (
                      <button
                        className='btn btn-sm btn-ghost rem-btn'
                        title='Remanufacture'
                        data-comment={`prod-i-rem-${rowKey}`}
                        onClick={event => {
                          event.stopPropagation()
                          openPad({
                            kind: 'reman',
                            source: 'machine',
                            orderId: first.orderId,
                            lineId: first.id
                          })
                        }}
                      >
                        <RefreshCw style={{ width: '14px', height: '14px' }} />
                      </button>
                    )
                  ) : (
                    <span
                      className='subtle'
                      data-comment={`prod-i-rem-${rowKey}`}
                      style={{ fontSize: '11px' }}
                      title='Open the order to remanufacture a specific line'
                    >
                      {gitems.length} orders
                    </span>
                  )}
                </td>
                <td data-comment={`prod-i-mc-${rowKey}`}>
                  {done || !solo ? (
                    <span className='mono' data-comment={`prod-i-mach-${rowKey}`}>
                      {machineById(group.machineId)?.name || '—'}
                    </span>
                  ) : (
                    <button
                      className='field-btn field-sel'
                      data-pop-anchor
                      data-comment={`prod-i-mach-${rowKey}`}
                      onClick={event => {
                        event.stopPropagation()
                        openPop(
                          event.currentTarget,
                          trimStore
                            .get()
                            .machines.filter(machine => machine.id !== group.machineId)
                            .map(machine => ({ label: machine.name, value: machine.id })),
                          value => {
                            reassignMachine(first.orderId, first.id, value as number)
                            showToast(
                              `Reassigned to ${machineById(value as number)?.name || 'machine'} · new single-item bendlist`
                            )
                            setActiveMachine(value as number)
                          }
                        )
                      }}
                    >
                      <span>{machineById(group.machineId)?.name || '—'}</span>
                      <ChevronDown style={{ width: '13px', height: '13px' }} />
                    </button>
                  )}
                </td>
                <td data-comment={`prod-i-st-${rowKey}`}>
                  {state === 'partial' && !solo ? (
                    <span className='status st-inprogress' data-comment={`prod-stp-${rowKey}`}>
                      <span className='st-dot' />
                      Mixed
                    </span>
                  ) : (
                    <ProdStatusPill status={first.status} comment={`prod-stp-${rowKey}`} />
                  )}
                </td>
                <td data-comment={`prod-i-complete-${rowKey}`}>{completeCell}</td>
                <td data-comment={`prod-i-draw-${rowKey}`}>
                  <DrawingThumb />
                </td>
                <td data-comment={`prod-i-note-${rowKey}`}>
                  {solo ? (
                    <button
                      className={`note-btn ${noteState(first.notes) === 'unread' ? 'has-unread' : noteState(first.notes) === 'read' ? 'all-read' : ''}`}
                      data-comment={`prod-note-${rowKey}`}
                      title='Line notes'
                      onClick={event => {
                        event.stopPropagation()
                        openNotes({ orderId: first.orderId, lineId: first.id })
                      }}
                    >
                      <MessageSquare style={{ width: '14px', height: '14px' }} />
                      {noteState(first.notes) !== 'none' ? <span className='note-dot' /> : null}
                    </button>
                  ) : (
                    <span
                      className='subtle'
                      data-comment={`prod-note-${rowKey}`}
                      style={{ fontSize: '11px' }}
                    >
                      {gitems.length}
                    </span>
                  )}
                </td>
              </>
            )}
          </tr>
        )
      })}
    </>
  )
}

const RemanCutlistCard = ({ reman }: { reman: Reman }) => {
  const expandedBatches = useStore(trimStore, state => state.expandedBatches)
  const opNotes = useStore(trimStore, state => state.opNotes)
  const expKey = `RS|${reman.id}`
  const expanded = expandedBatches.includes(expKey)
  const priority = priorityById(reman.priorityId)
  const machine = machineById(reman.machineId)

  return (
    <div
      className={`bendlist${expanded ? ' is-expanded' : ''}`}
      data-comment={`remcut-card-${reman.id}`}
    >
      <div className='bendlist-head prod-head' data-comment={`remcut-head-${reman.id}`}>
        <button
          aria-label='Toggle rows'
          className={`expander ${expanded ? 'open' : ''}`}
          data-comment={`remcut-exp-${reman.id}`}
          onClick={() => toggleBatchExpand(expKey)}
        >
          <ChevronRight style={{ width: '14px', height: '14px' }} />
        </button>
        <span className='bendlist-key' data-comment={`remcut-key-${reman.id}`}>
          {reman.gaugeColour}
          {remanIsStock(reman) ? <StockIco comment={`remcut-stockico-${reman.id}`} /> : null}
        </span>
        <span className='pri-slot' data-comment={`remcut-prislot-${reman.id}`}>
          {priority && !reman.slinetDone ? (
            <span
              className={`pri ${priority.cls} readonly`}
              data-comment={`remcut-pri-${reman.id}`}
            >
              <span className='pri-dot' />
              {priority.name}
            </span>
          ) : null}
        </span>
        <span className='prod-flags' data-comment={`remcut-flags-${reman.id}`}>
          <RemanCell
            label='Recut'
            qty={reman.qty}
            green={reman.recut}
            comment={`remcut-recut-${reman.id}`}
            note={`requested from ${reman.source === 'machine' ? (machine?.name ?? 'machine') : 'the Wrapping tab'}`}
          />
          <span
            className='mono subtle'
            data-comment={`remcut-ord-${reman.id}`}
            style={{ fontSize: '11px' }}
          >
            {reman.orderNo}
          </span>
        </span>
        <span className='toolbar-spacer' />
        {/* #214: a completed recut keeps only its Done stamp */}
        {reman.slinetDone ? (
          <>
            <span className='status st-wrapped' data-comment={`remcut-done-${reman.id}`}>
              <Check style={{ width: '14px', height: '14px' }} />
              Done
            </span>
            <span className='done-stamp' data-comment={`remcut-donestamp-${reman.id}`}>
              {fmtStamp(reman.slinetDoneAt)}
            </span>
          </>
        ) : (
          <>
            <button
              className='btn btn-sm'
              data-comment={`remcut-coils-${reman.id}`}
              disabled={!reman.fromCutlistId}
              title={
                reman.fromCutlistId ? undefined : 'Original cutlist is closed — no coils to adjust'
              }
              onClick={() => openCutlistCoils(reman.gaugeColour)}
            >
              <Database style={{ width: '14px', height: '14px' }} />
              Cutlist Coils
            </button>
            <button
              className='btn btn-sm'
              data-comment={`remcut-donebtn-${reman.id}`}
              disabled={!reman.recut}
              title={reman.recut ? undefined : 'Available once the recut row is Complete'}
              onClick={() => askRemanListDone(reman.id, 'slinet')}
            >
              Done
            </button>
          </>
        )}
      </div>

      {expanded ? (
        <table
          className='sub'
          data-comment={`remcut-table-${reman.id}`}
          style={{ border: 'none', borderRadius: 0 }}
        >
          <thead>
            <tr>{SLINET_COLUMNS}</tr>
          </thead>
          <tbody>
            <tr
              className={reman.recut ? 'row-complete' : ''}
              data-comment={`remcut-row-${reman.id}`}
            >
              <td className='mono' data-comment={`remcut-w-${reman.id}`}>
                {reman.width.toFixed(1)}
              </td>
              <td
                className={`mono ${reman.length !== 120 ? 'len-alert' : ''}`}
                data-comment={`remcut-l-${reman.id}`}
              >
                {reman.length}&quot;
              </td>
              <td className='mono' data-comment={`remcut-total-${reman.id}`}>
                <b>{reman.qty}</b>
              </td>
              {['Press Brake', 'V1', 'V2', 'Rollformer', 'Vented', 'Caps'].map(name => {
                if (name === 'Vented')
                  return (
                    <td key={name} className='mono' data-comment={`remcut-vent-${reman.id}`}>
                      <span className='subtle'>—</span>
                    </td>
                  )
                const machineForColumn = BENDLIST_MACHINES.find(
                  candidate => candidate.name === name
                )!
                return (
                  <td
                    key={name}
                    className='mono'
                    data-comment={`remcut-m${machineForColumn.id}-${reman.id}`}
                  >
                    {machineForColumn.id === reman.machineId ? (
                      reman.qty
                    ) : (
                      <span className='subtle'>—</span>
                    )}
                  </td>
                )
              })}
              <td className='mono' data-comment={`remcut-flat-${reman.id}`}>
                <span className='subtle'>—</span>
              </td>
              <td data-comment={`remcut-op-${reman.id}`}>
                <input
                  className='op-note'
                  type='text'
                  data-comment={`remcut-opnote-${reman.id}`}
                  placeholder='Notes…'
                  value={opNotes[`rem-${reman.id}`] ?? ''}
                  onChange={event => setOpNote(`rem-${reman.id}`, event.target.value)}
                />
              </td>
              <td data-comment={`remcut-complete-${reman.id}`}>
                <label
                  className='complete-toggle'
                  data-comment={`remcut-completelbl-${reman.id}`}
                  title={
                    reman.recut
                      ? 'Marked complete — uncheck to reopen (asks first)'
                      : 'Mark the recut complete'
                  }
                >
                  <input
                    type='checkbox'
                    className='chk'
                    data-comment={`remcut-completechk-${reman.id}`}
                    checked={reman.recut}
                    onChange={() => askRemanFlag(reman.id, 'recut', !reman.recut)}
                  />
                  <span className='complete-yn'>{reman.recut ? 'Yes' : 'No'}</span>
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

/**
 * The machine tab's half of a remanufacture, which is a different card from the Slinet's.
 *
 * Its Remanufacture cell stays orange until the Slinet marks the recut Cut, whichever tab raised the
 * request, because a machine cannot bend material that has not been cut again yet. N-066/069: a
 * machine-raised list shows the line's full Qty Ordered beside the reman qty; a Wrapping-raised one
 * shows only the reman qty, since the rest of the order has already been made.
 */
const RemanBendlistCard = ({ reman }: { reman: Reman }) => {
  const expandedBatches = useStore(trimStore, state => state.expandedBatches)
  const orders = useStore(trimStore, state => state.orders)
  const expKey = `RM|${reman.id}`
  const expanded = expandedBatches.includes(expKey)
  const priority = priorityById(reman.priorityId)

  const line = orders
    .find(order => order.id === reman.orderId)
    ?.lineItems.find(item => item.id === reman.lineId)
  const ordered = reman.source === 'machine' ? (line?.qty ?? reman.qty) : reman.qty
  const notes = noteState(line?.notes)

  return (
    <div
      className={`bendlist${expanded ? ' is-expanded' : ''}`}
      data-comment={`reman-card-${reman.id}`}
    >
      <div className='bendlist-head prod-head' data-comment={`reman-head-${reman.id}`}>
        <button
          aria-label='Toggle rows'
          className={`expander ${expanded ? 'open' : ''}`}
          data-comment={`reman-exp-${reman.id}`}
          onClick={() => toggleBatchExpand(expKey)}
        >
          <ChevronRight style={{ width: '14px', height: '14px' }} />
        </button>
        <span className='bendlist-key' data-comment={`reman-key-${reman.id}`}>
          {reman.gaugeColour}
          {remanIsStock(reman) ? <StockIco comment={`reman-stockico-${reman.id}`} /> : null}
        </span>
        <span className='pri-slot' data-comment={`reman-prislot-${reman.id}`}>
          {priority && !reman.machineDone ? (
            <span className={`pri ${priority.cls} readonly`} data-comment={`reman-pri-${reman.id}`}>
              <span className='pri-dot' />
              {priority.name}
            </span>
          ) : null}
        </span>
        <span className='prod-flags' data-comment={`reman-flags-${reman.id}`}>
          <RemanCell
            label='Remanufacture'
            qty={reman.qty}
            green={reman.recut}
            comment={`reman-remc-${reman.id}`}
            note={`requested from the ${reman.source === 'machine' ? 'Machine' : 'Wrapping'} tab${reman.recut ? '' : ' — awaiting the Slinet recut'}`}
          />
          <span
            className='mono subtle'
            data-comment={`reman-ord-${reman.id}`}
            style={{ fontSize: '11px' }}
          >
            {reman.orderNo}
          </span>
        </span>
        <span className='toolbar-spacer' />
        {/* #214: same as the recut card — done means done */}
        {reman.machineDone ? (
          <>
            <span className='status st-wrapped' data-comment={`reman-done-${reman.id}`}>
              <Check style={{ width: '14px', height: '14px' }} />
              Done
            </span>
            <span className='done-stamp' data-comment={`reman-donestamp-${reman.id}`}>
              {fmtStamp(reman.machineDoneAt)}
            </span>
          </>
        ) : (
          <button
            className='btn btn-sm'
            data-comment={`reman-donebtn-${reman.id}`}
            disabled={!reman.bent}
            title={reman.bent ? undefined : 'Available once the remanufacture row is Complete'}
            onClick={() => askRemanListDone(reman.id, 'machine')}
          >
            Done
          </button>
        )}
      </div>

      {expanded ? (
        <table
          className='sub'
          data-comment={`reman-table-${reman.id}`}
          style={{ border: 'none', borderRadius: 0 }}
        >
          <thead>
            <tr>
              <th style={{ width: '54px' }}>W&quot;</th>
              <th style={{ width: '54px' }}>L&quot;</th>
              <th style={{ width: '74px' }}>Qty Ordered</th>
              <th style={{ width: '72px' }}>Stock</th>
              <th style={{ width: '96px' }}>Qty to Manufacture</th>
              <th style={{ width: '116px' }}>ID</th>
              <th>Description</th>
              <th style={{ width: '80px' }}>Remanufacture</th>
              <th style={{ width: '118px' }}>Machine</th>
              <th style={{ width: '116px' }}>Status</th>
              <th style={{ width: '88px' }}>Complete</th>
              <th style={{ width: '60px' }}>Drawing</th>
              <th style={{ width: '56px' }}>Line Item Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr className={reman.bent ? 'row-complete' : ''} data-comment={`reman-row-${reman.id}`}>
              <td className='mono' data-comment={`reman-w-${reman.id}`}>
                {reman.width.toFixed(1)}
              </td>
              <td
                className={`mono ${reman.length !== 120 ? 'len-alert' : ''}`}
                data-comment={`reman-l-${reman.id}`}
              >
                {reman.length}&quot;
              </td>
              <td className='mono' data-comment={`reman-ordqty-${reman.id}`}>
                {ordered}
              </td>
              <td className='mono' data-comment={`reman-stock-${reman.id}`}>
                <span className='subtle'>—</span>
              </td>
              <td className='mono' data-comment={`reman-mfg-${reman.id}`}>
                <b>{reman.qty}</b>
              </td>
              <td className='mono' data-comment={`reman-pid-${reman.id}`}>
                {reman.productId}
              </td>
              <td className='trunc' data-comment={`reman-desc-${reman.id}`}>
                {reman.description}
              </td>
              <td data-comment={`reman-remc-cell-${reman.id}`}>
                <RemanCell
                  label=''
                  qty={reman.qty}
                  green={reman.recut}
                  comment={`reman-remcellbadge-${reman.id}`}
                />
              </td>
              <td className='mono' data-comment={`reman-mach-${reman.id}`}>
                {machineById(reman.machineId)?.name || '—'}
              </td>
              <td data-comment={`reman-st-${reman.id}`}>
                <ProdStatusPill
                  status={reman.recut ? 'cut' : 'in_progress'}
                  comment={`reman-stp-${reman.id}`}
                />
              </td>
              <td data-comment={`reman-complete-${reman.id}`}>
                <label
                  className='complete-toggle'
                  data-comment={`reman-completelbl-${reman.id}`}
                  title={
                    reman.bent
                      ? 'Marked complete — uncheck to reopen (asks first)'
                      : 'Mark the remanufacture Bent (Complete)'
                  }
                >
                  <input
                    type='checkbox'
                    className='chk'
                    data-comment={`reman-completechk-${reman.id}`}
                    checked={reman.bent}
                    onChange={() => askRemanFlag(reman.id, 'bent', !reman.bent)}
                  />
                  <span className='complete-yn'>{reman.bent ? 'Yes' : 'No'}</span>
                </label>
              </td>
              <td data-comment={`reman-draw-${reman.id}`}>
                <DrawingThumb />
              </td>
              <td data-comment={`reman-note-${reman.id}`}>
                {line ? (
                  <button
                    className={`note-btn ${notes === 'unread' ? 'has-unread' : notes === 'read' ? 'all-read' : ''}`}
                    data-comment={`reman-notebtn-${reman.id}`}
                    title='Line notes'
                    onClick={() => openNotes({ orderId: reman.orderId, lineId: reman.lineId })}
                  >
                    <MessageSquare style={{ width: '14px', height: '14px' }} />
                    {notes !== 'none' ? <span className='note-dot' /> : null}
                  </button>
                ) : (
                  <span className='subtle'>—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

const BatchCard = ({
  batch,
  batchKey,
  machineId,
  isSlinet
}: {
  batch: ReturnType<typeof computeBatches>[number]
  batchKey: string
  machineId: number | null
  isSlinet: boolean
}) => {
  const expandedBatches = useStore(trimStore, state => state.expandedBatches)
  const expKey = `${isSlinet ? 'S' : `M${machineId}`}|${batch.id}`
  const expanded = expandedBatches.includes(expKey)
  const priority = priorityById(batch.priorityId)
  const doneHere = isSlinet ? !!batch.doneSlinet : (batch.doneMachines || []).includes(machineId!)
  /* #214: a finished list is not late and has nothing left to act on — no overdue paint, no
     Priority, no Cutlist Coils. */
  const overdue = !doneHere && isOverdue(batch.date)
  const stepStatus = isSlinet ? 'cut' : 'bent'
  /**
   * N-056/199, and #195: reaching the station's step on every line is the *only* gate. A cutlist whose
   * coils have not been adjusted can still be marked Done — the worker adjusts coils whenever.
   */
  const canDone = batch.items.every(item => (RANK[item.status ?? ''] || 0) >= RANK[stepStatus]!)

  return (
    <div
      className={`bendlist${expanded ? ' is-expanded' : ''}`}
      data-comment={`prod-batch-${batchKey}`}
    >
      <div
        className='bendlist-head prod-head'
        data-comment={`prod-batchhead-${batchKey}`}
        style={overdue ? { background: 'var(--overdue-soft)' } : undefined}
      >
        <button
          aria-label='Toggle rows'
          className={`expander ${expanded ? 'open' : ''}`}
          data-comment={`prod-batchexp-${batchKey}`}
          onClick={() => toggleBatchExpand(expKey)}
        >
          <ChevronRight style={{ width: '14px', height: '14px' }} />
        </button>

        {/* #213: no title and no date — the frozen day divider says both */}
        <span className='bendlist-key' data-comment={`prod-batchkey-${batchKey}`}>
          {batch.gaugeColour}
          {batch.items.some(item => item.isStock) ? (
            <StockIco
              comment={`prod-stockico-${batchKey}`}
              title={
                batch.items.every(item => item.isStock)
                  ? 'Stock order'
                  : 'Includes stock-order lines'
              }
            />
          ) : null}
        </span>

        <span className='pri-slot' data-comment={`prod-batchprislot-${batchKey}`}>
          {priority && !doneHere ? (
            <span
              className={`pri ${priority.cls} readonly`}
              data-comment={`prod-batchpri-${batchKey}`}
            >
              <span className='pri-dot' />
              {priority.name}
            </span>
          ) : null}
        </span>

        <span className='prod-flags' data-comment={`prod-flags-${batchKey}`}>
          {batch.slinetStarted && !isSlinet ? (
            <span className='status st-inprogress' data-comment={`prod-batchip-${batchKey}`}>
              <span className='st-dot' />
              In Progress
            </span>
          ) : null}
          {overdue ? (
            <span
              className='split-badge'
              style={{
                color: 'var(--danger)',
                background: 'var(--danger-soft)',
                borderColor: 'var(--danger)'
              }}
              data-comment={`prod-batchover-${batchKey}`}
            >
              Overdue
            </span>
          ) : null}
        </span>

        <span className='toolbar-spacer' />

        {isSlinet && !doneHere ? (
          <button
            className='btn btn-sm'
            data-comment={`prod-coils-${batchKey}`}
            onClick={() => openCutlistCoils(batch.gaugeColour)}
          >
            <Database style={{ width: '14px', height: '14px' }} />
            Cutlist Coils
          </button>
        ) : null}

        {doneHere ? (
          <>
            <span className='status st-wrapped' data-comment={`prod-done-${batchKey}`}>
              <Check style={{ width: '14px', height: '14px' }} />
              Done
            </span>
            <span className='done-stamp' data-comment={`prod-donestamp-${batchKey}`}>
              {fmtStamp(isSlinet ? batch.doneSlinetAt : (batch.doneMachineAt || {})[machineId!])}
            </span>
          </>
        ) : (
          <button
            className='btn btn-sm'
            data-comment={`prod-donebtn-${batchKey}`}
            disabled={!canDone}
            title={canDone ? undefined : 'Available once every row is Complete'}
            onClick={() =>
              askConfirm(
                `Mark this ${isSlinet ? 'cutlist' : 'bendlist'} done?`,
                // #212: coils only hang off a cutlist, so the bendlist keeps the reminder minus that clause
                isSlinet
                  ? 'Confirm that you have made all the necessary coil adjustments and that you are done with this cutlist.'
                  : 'Confirm that you are done with this bendlist.',
                () => {
                  markBatchDone(batch.id, isSlinet ? 'slinet' : machineId!)
                  closeConfirm()
                }
              )
            }
          >
            Done
          </button>
        )}
      </div>

      {expanded ? (
        <table
          className='sub'
          data-comment={`prod-batchtable-${batchKey}`}
          style={{ border: 'none', borderRadius: 0 }}
        >
          <thead>
            <tr>
              {isSlinet ? (
                SLINET_COLUMNS
              ) : (
                <>
                  <th style={{ width: '54px' }}>W&quot;</th>
                  <th style={{ width: '54px' }}>L&quot;</th>
                  <th style={{ width: '74px' }}>Qty Ordered</th>
                  <th style={{ width: '72px' }}>Stock</th>
                  <th style={{ width: '96px' }}>Qty to Manufacture</th>
                  <th style={{ width: '116px' }}>ID</th>
                  <th>Description</th>
                  <th style={{ width: '80px' }}>Remanufacture</th>
                  <th style={{ width: '118px' }}>Machine</th>
                  <th style={{ width: '116px' }}>Status</th>
                  <th style={{ width: '88px' }}>Complete</th>
                  <th style={{ width: '60px' }}>Drawing</th>
                  <th style={{ width: '56px' }}>Line Item Notes</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            <BatchRows
              batchId={batch.id}
              batchKey={batchKey}
              items={batch.items}
              isSlinet={isSlinet}
              stepStatus={stepStatus}
            />
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

/**
 * #179/#182: reman lists sit inline among the normal ones, in the same date × priority order, so they
 * share the day dividers rather than living in a section of their own.
 */
const BatchList = ({
  batches,
  remans,
  machineId,
  isSlinet,
  pfx
}: {
  batches: ReturnType<typeof computeBatches>
  remans: Reman[]
  machineId: number | null
  isSlinet: boolean
  pfx: string
}) => {
  const listWord = isSlinet ? 'cutlist' : 'bendlist'
  const perDay = new Map<string, number>()
  for (const entry of [...batches, ...remans])
    perDay.set(entry.date, (perDay.get(entry.date) ?? 0) + 1)

  const sortKey = (entry: { date: string; priorityId: number | null }) =>
    `${entry.date}|${String(priorityById(entry.priorityId)?.hierarchy || 99).padStart(2, '0')}`

  // one merged stream, so a day divider is emitted once whichever kind of list opens the day
  const queue = [...remans]
  const out: { key: string; date: string; node: React.ReactNode }[] = []

  const flushRemans = (before: string | null) => {
    while (queue.length && (before === null || sortKey(queue[0]!) <= before)) {
      const reman = queue.shift()!
      out.push({
        key: `rem-${reman.id}`,
        date: reman.date,
        node: isSlinet ? <RemanCutlistCard reman={reman} /> : <RemanBendlistCard reman={reman} />
      })
    }
  }

  batches.forEach((batch, index) => {
    flushRemans(sortKey(batch))
    const batchKey = `${pfx}${index}`
    out.push({
      key: batchKey,
      date: batch.date,
      node: (
        <BatchCard batch={batch} batchKey={batchKey} machineId={machineId} isSlinet={isSlinet} />
      )
    })
  })
  flushRemans(null)

  let lastDate: string | null = null

  return (
    <>
      {out.map(entry => {
        const newDay = entry.date !== lastDate
        const first = lastDate === null
        if (newDay) lastDate = entry.date

        return (
          <Fragment key={entry.key}>
            {newDay ? (
              <DaySep
                date={entry.date}
                first={first}
                count={perDay.get(entry.date) ?? 0}
                listWord={listWord}
                pfx={pfx}
              />
            ) : null}
            {entry.node}
          </Fragment>
        )
      })}
    </>
  )
}

export const Production = () => {
  // the whole state, and it is threaded into the selectors below rather than read by them: a selector
  // that takes only primitives is one the React Compiler may answer once and never call again
  const state = useStore(trimStore, current => current)
  const { activeMachine, prodMode, prodListMode } = state

  const modeBar = (
    <div className='prodmode-bar' data-comment='prod-modebar'>
      <button
        className={`seg ${prodMode === 'trim' ? 'active' : ''}`}
        data-comment='prod-mode-trim'
        onClick={() => setProdMode('trim')}
      >
        <Layers style={{ width: '14px', height: '14px' }} />
        Trim
      </button>
      <button
        className={`seg ${prodMode === 'stock' ? 'active' : ''}`}
        data-comment='prod-mode-stock'
        onClick={() => setProdMode('stock')}
      >
        <PackagePlus style={{ width: '14px', height: '14px' }} />
        Stock Manufacturing
      </button>
    </div>
  )

  // Stock Manufacturing is a different screen, not a filter on this one — the machine tabs go with it
  if (prodMode === 'stock')
    return (
      <>
        <FreezeBar>{modeBar}</FreezeBar>
        <StockMfg />
      </>
    )

  const isSlinet = activeMachine === 1
  const doneMode = prodListMode === 'completed'
  const listWord = isSlinet ? 'cutlists' : 'bendlists'

  const machineTabs = (
    <div className='machine-tabs' data-comment='prod-mtabs'>
      {MACHINE_TABS.map(machine => (
        <button
          key={machine.id}
          data-comment={`prod-mtab-${machine.id}`}
          className={`mtab ${activeMachine === machine.id ? 'active' : ''}${'gateway' in machine ? ' gateway' : ''}`}
          onClick={() => setActiveMachine(machine.id)}
        >
          {machine.name}
        </button>
      ))}
      <span className='toolbar-spacer' />
      {/* #213: the worker reaches the coils from where he is standing — the same list the Coils tab
          shows, under the Manager's filter, with no filter of its own. */}
      <Link
        className='btn btn-sm'
        data-comment='prod-coilsbtn'
        to='/trim'
        search={{ view: 'coils' }}
      >
        <Database style={{ width: '14px', height: '14px' }} />
        Coils
      </Link>
    </div>
  )

  // Wrapping is the terminal station: it has no Active/Completed switch and no capacity of its own
  if (activeMachine === 7)
    return (
      <>
        <FreezeBar>
          {modeBar}
          {machineTabs}
        </FreezeBar>
        <Wrapping />
      </>
    )

  const batches = computeBatches(activeMachine, isSlinet, state).filter(
    batch =>
      (isSlinet ? !!batch.doneSlinet : (batch.doneMachines || []).includes(activeMachine!)) ===
      doneMode
  )
  const remans = isSlinet
    ? remanCutlistEntries(doneMode, state.remans)
    : remanBendlistEntries(activeMachine, doneMode, state.remans)

  const body = () => {
    if (!state.cutlists.length && !state.remans.length)
      return (
        <EmptyState
          title='No production batches yet'
          text='Release orders from the Scheduled tab. Cutlists & bendlists appear here, grouped by date × gauge/colour × priority.'
        />
      )

    if (!batches.length && !remans.length)
      return doneMode ? (
        <EmptyState
          title={`No completed ${listWord} on ${machineById(activeMachine)?.name}`}
          text='Lists land here the moment this station marks them Done — no wait on wrapping.'
        />
      ) : (
        <EmptyState
          title={`Nothing on ${machineById(activeMachine)?.name}`}
          text='No released line items are routed here yet.'
        />
      )

    return (
      <BatchList
        batches={batches}
        remans={remans}
        machineId={activeMachine}
        isSlinet={isSlinet}
        pfx={doneMode ? 'c' : ''}
      />
    )
  }

  return (
    <>
      {/* #208: the mode bar, the machine tabs and the Active/Completed switch are the controls the
          worker steers by — they stay put while the lists scroll under them. */}
      <FreezeBar>
        {modeBar}
        {machineTabs}

        {/* #192: every machine tab carries its own Active / Completed switch, and a completed list
            renders in exactly the format the worker used — same cards, same columns, same expand. */}
        <div className='prodlist-tabs' data-comment='prod-listtabs'>
          <button
            className={`seg ${doneMode ? '' : 'active'}`}
            data-comment='prod-listtab-active'
            onClick={() => setProdListMode('active')}
          >
            Active {listWord}
          </button>
          <button
            className={`seg ${doneMode ? 'active' : ''}`}
            data-comment='prod-listtab-completed'
            onClick={() => setProdListMode('completed')}
          >
            <History style={{ width: '14px', height: '14px' }} />
            Completed {listWord} · past 90 days
          </button>
        </div>
      </FreezeBar>

      {/* #209: the Slinet gets the strip too, minus the daily max it does not have */}
      {doneMode ? null : <MachineTotals machineId={activeMachine} slinet={isSlinet} />}

      {body()}
    </>
  )
}
