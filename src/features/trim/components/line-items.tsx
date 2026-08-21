import { Calendar, CalendarDays, ChevronDown, Lock, MessageSquare, Split } from 'lucide-react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import { usePopover } from '@/components/shell/pop'

import { fmtDate } from '../format'
import {
  isReleased,
  lineDay,
  lineReleased,
  machineById,
  noteState,
  qtyToMake,
  ventedOf
} from '../selectors'
import {
  setFromStock,
  setLineField,
  setLineMachine,
  setVented,
  toggleLineSelect,
  toggleVented,
  trimStore
} from '../store'
import { openNotes, openSchedule, showToast } from '../ui'
import { LineStatusPill } from './bits'

import type { LineItem, Order } from '../types'

/**
 * The line items under an expanded order — one component for both tabs, as it is one function in the
 * prototype. The two contexts are not two designs: Scheduled is Unscheduled plus the columns a
 * Manager reviews an order through (vented, machine, stock, status, width, length), so splitting them
 * would mean maintaining the shared eight columns twice.
 */

type Context = 'uns' | 'sch'

/**
 * N-166/#114: the line-item grid moves its columns too. Which columns exist depends on the tab and on
 * whether the order is a stock order, so the list is built per render — the hook keeps saved keys that
 * are still declared and ignores the rest, which is exactly what a column that comes and goes needs.
 */
const columnsFor = (isScheduled: boolean, isStock: boolean): Column[] => [
  { key: 'qty', label: 'Qty', width: '60px' },
  ...(isScheduled
    ? [
        { key: 'vent', label: 'Vented', width: '72px' },
        { key: 'machine', label: 'Machine', width: '128px' },
        // N-032: a stock order has no «# From Stock» to take from
        ...(isStock ? [] : [{ key: 'stock', label: 'Stock', width: '80px' }]),
        { key: 'status', label: 'Status', width: '116px' }
      ]
    : []),
  { key: 'pid', label: 'Product ID', width: '116px' },
  { key: 'desc', label: 'Description' },
  ...(isScheduled
    ? [
        { key: 'w', label: 'W"', width: '54px' },
        { key: 'l', label: 'L"', width: '54px' }
      ]
    : []),
  { key: 'notes', label: 'Notes', width: '48px' }
]

const LineNotes = ({ ctx, orderId, item }: { ctx: Context; orderId: number; item: LineItem }) => {
  const state = noteState(item.notes)

  return (
    <td data-col='notes' data-comment={`${ctx}-linote-${item.id}`}>
      <button
        data-comment={`${ctx}-linotebtn-${item.id}`}
        className={`note-btn ${state === 'unread' ? 'has-unread' : state === 'read' ? 'all-read' : ''}`}
        title='Line item notes'
        onClick={event => {
          event.stopPropagation()
          openNotes({ orderId, lineId: item.id })
        }}
      >
        <MessageSquare style={{ width: '14px', height: '14px' }} />
        {state !== 'none' ? <span className='note-dot' /> : null}
      </button>
    </td>
  )
}

/**
 * N-112. Nothing to make, bypassed production, or a line sitting on another day each have their own
 * answer, and none of them is an unticked checkbox — an empty control would read as "not vented yet".
 */
const VentCell = ({
  ctx,
  order,
  item,
  otherDay
}: {
  ctx: Context
  order: Order
  item: LineItem
  otherDay: boolean
}) => {
  const vented = ventedOf(item)

  if (otherDay)
    return (
      <span
        className='subtle'
        data-comment={`${ctx}-ventro-${item.id}`}
        style={{ fontSize: '11px' }}
      >
        —
      </span>
    )
  if (order.bypassed)
    return (
      <span
        className='subtle'
        data-comment={`${ctx}-ventro-${item.id}`}
        style={{ fontSize: '11px' }}
      >
        N/A
      </span>
    )
  if (qtyToMake(item) <= 0)
    return (
      <span className='subtle' style={{ fontSize: '11px' }}>
        —
      </span>
    )
  if (lineReleased(order, item))
    return vented ? (
      <span className='mono' data-comment={`${ctx}-ventro-${item.id}`}>
        {vented}
      </span>
    ) : (
      <span
        className='subtle'
        data-comment={`${ctx}-ventro-${item.id}`}
        style={{ fontSize: '11px' }}
      >
        —
      </span>
    )

  return (
    <label className='vent-cell' data-comment={`${ctx}-ventwrap-${item.id}`}>
      <input
        type='checkbox'
        className='chk'
        data-comment={`${ctx}-ventchk-${item.id}`}
        checked={!!vented}
        onChange={() => toggleVented(order.id, item.id)}
      />
      {vented ? (
        <input
          className='field-input vent-qty'
          type='number'
          min='1'
          max={qtyToMake(item)}
          value={vented}
          placeholder='1'
          data-comment={`${ctx}-ventqty-${item.id}`}
          title='Pieces to vent'
          onChange={event => setVented(order.id, item.id, Number.parseInt(event.target.value, 10))}
        />
      ) : null}
    </label>
  )
}

const MachineCell = ({
  ctx,
  order,
  item,
  otherDay,
  onPick
}: {
  ctx: Context
  order: Order
  item: LineItem
  otherDay: boolean
  onPick: (anchor: HTMLElement, item: LineItem) => void
}) => {
  if (otherDay || order.bypassed || (item.fromStock || 0) >= item.qty)
    return (
      <span className='subtle' style={{ fontSize: '11px' }}>
        {otherDay ? '—' : order.bypassed ? 'N/A' : 'Stock'}
      </span>
    )

  const machine = machineById(item.machineId)

  return (
    <button
      className={`field-btn field-sel ${machine ? '' : 'is-empty'}`}
      data-pop-anchor
      data-comment={`${ctx}-machbtn-${item.id}`}
      onClick={event => {
        event.stopPropagation()
        onPick(event.currentTarget, item)
      }}
    >
      <span>{machine ? machine.name : 'Assign'}</span>
      <ChevronDown style={{ width: '14px', height: '14px' }} />
    </button>
  )
}

/**
 * The header above the lines. On Unscheduled it is the split control; on Scheduled it is the two
 * actions a Manager still has before Release (N-041/042), and after Release it is nothing at all.
 */
const SubHead = ({
  order,
  ctx,
  activeDay
}: {
  order: Order
  ctx: Context
  activeDay?: string | null
}) => {
  const splitOrderId = useStore(trimStore, state => state.splitOrderId)
  const selectedLineIds = useStore(trimStore, state => state.selectedLineIds)

  if (ctx === 'sch') {
    if (isReleased(order, activeDay)) return null

    return (
      <div className='subhead' data-comment={`sch-subhead-${order.id}`}>
        <span className='subhead-title' data-comment={`sch-subtitle-${order.id}`}>
          Reviewing order
        </span>
        <button
          className='btn btn-sm'
          data-pop-anchor
          data-comment={`sch-reschedule-${order.id}`}
          onClick={() =>
            openSchedule({
              mode: 'reschedule',
              orderId: order.id,
              order: order.order,
              // #6: the panel belongs to one part, so it reschedules that day and not the order's first
              current: activeDay ?? order.productionDate
            })
          }
        >
          <Calendar style={{ width: '14px', height: '14px' }} />
          Reschedule
        </button>
      </div>
    )
  }

  const splitCount = splitOrderId === order.id ? selectedLineIds.length : 0

  return (
    <div
      className={`subhead split-head${splitCount ? ' is-active' : ''}`}
      data-comment={`uns-subhead-${order.id}`}
    >
      <span className='split-head-info' data-comment={`uns-splitinfo-${order.id}`}>
        <span className='split-head-title' data-comment={`uns-splittitle-${order.id}`}>
          <Split style={{ width: '15px', height: '15px' }} />
          Split order
        </span>
        {splitCount ? (
          <span className='split-head-hint' data-comment={`uns-splithint-${order.id}`}>
            <b>{splitCount}</b> line item{splitCount > 1 ? 's' : ''} picked — schedule them to their
            own day.
          </span>
        ) : null}
      </span>
      {/*
        The prototype spends `uns-split-<id>` on the split indicator in the order row, and both are on
        screen at once — a comment anchored to «uns-split-1» could not say which it meant, so the
        button this port adds carries its own name.
      */}
      <button
        className='btn btn-sm'
        data-comment={`uns-splitbtn-${order.id}`}
        disabled={!splitCount}
        onClick={() =>
          openSchedule({
            mode: 'split',
            orderId: order.id,
            lineIds: selectedLineIds,
            lineCount: splitCount,
            total: order.lineItems.length,
            order: order.order
          })
        }
      >
        <CalendarDays style={{ width: '14px', height: '14px' }} />
        Split &amp; schedule{splitCount ? ` (${splitCount})` : ''}
      </button>
    </div>
  )
}

export const LineItemsSubrow = ({
  order,
  ctx,
  activeDay
}: {
  order: Order
  ctx: Context
  /** The day the Scheduled tab is showing; `null` on «All Scheduled Orders», where no line is elsewhere (#172). */
  activeDay?: string | null
}) => {
  const isScheduled = ctx === 'sch'
  const splitOrderId = useStore(trimStore, state => state.splitOrderId)
  const selectedLineIds = useStore(trimStore, state => state.selectedLineIds)
  const selectedOrderIds = useStore(trimStore, state => state.selectedOrderIds)

  const orderSelectedForWhole = !isScheduled && selectedOrderIds.includes(order.id)
  const { headers, cells } = useColumnOrder(
    `${ctx}-li`,
    columnsFor(isScheduled, order.type === 'stock'),
    { notify: showToast }
  )
  const { openPop, popNode } = usePopover()

  const pickMachine = (anchor: HTMLElement, item: LineItem) =>
    openPop(
      anchor,
      trimStore.get().machines.map(machine => ({ label: machine.name, value: machine.id })),
      value => setLineMachine(order.id, item.id, value as number),
      item.machineId ?? undefined
    )

  return (
    <tr className='subrow' data-comment={`${ctx}-subrow-${order.id}`}>
      <td colSpan={isScheduled ? 11 : 8}>
        <div className='subwrap' data-comment={`${ctx}-subwrap-${order.id}`}>
          {popNode}
          {/* #202: the owner caption is gone — the accent rail ties the rows to their order */}
          <SubHead order={order} ctx={ctx} activeDay={activeDay} />

          <table className='sub' data-comment={`${ctx}-litable-${order.id}`}>
            <thead>
              <tr>
                <th style={{ width: '30px' }} />
                {headers}
              </tr>
            </thead>
            <tbody>
              {order.lineItems.map(item => {
                const lineSelected =
                  !isScheduled && splitOrderId === order.id && selectedLineIds.includes(item.id)
                /**
                 * N-016. On Scheduled a split order's lines belonging to another production day — or
                 * with no day at all — grey out, the same treatment split-locked lines get on
                 * Unscheduled.
                 */
                const otherDay = isScheduled && !!activeDay && lineDay(order, item) !== activeDay
                const locked = (!isScheduled && !!item.scheduledDate) || otherDay
                // #165: description and width stay editable while the order is under review
                const editable = isScheduled && !lineReleased(order, item) && !otherDay

                return (
                  <tr
                    key={item.id}
                    className={`${lineSelected ? 'li-selected' : ''}${locked ? ' li-locked' : ''}`}
                    data-comment={`${ctx}-li-${item.id}`}
                  >
                    <td>
                      {isScheduled ? (
                        otherDay ? (
                          <span
                            className='subtle li-lock-ico'
                            data-comment={`${ctx}-lilock-${item.id}`}
                            title={
                              item.scheduledDate
                                ? `Scheduled ${fmtDate(item.scheduledDate)}`
                                : 'Not yet scheduled'
                            }
                          >
                            <Lock style={{ width: '14px', height: '14px' }} />
                          </span>
                        ) : null
                      ) : locked ? (
                        <span
                          className='subtle li-lock-ico'
                          title={`Scheduled ${fmtDate(item.scheduledDate)}`}
                        >
                          <Lock style={{ width: '14px', height: '14px' }} />
                        </span>
                      ) : (
                        <input
                          type='checkbox'
                          className='chk'
                          data-comment={`${ctx}-lichk-${item.id}`}
                          checked={lineSelected}
                          disabled={orderSelectedForWhole}
                          title={
                            orderSelectedForWhole
                              ? 'Order selected for whole-order Schedule — clear it first'
                              : undefined
                          }
                          onChange={() => toggleLineSelect(order.id, item.id)}
                        />
                      )}
                    </td>
                    {cells({
                      qty: (
                        <td
                          data-col='qty'
                          className='cell-num'
                          data-comment={`${ctx}-liqty-${item.id}`}
                        >
                          {item.qty}
                        </td>
                      ),
                      ...(isScheduled
                        ? {
                            vent: (
                              <td data-col='vent' data-comment={`${ctx}-livent-${item.id}`}>
                                <VentCell ctx={ctx} order={order} item={item} otherDay={otherDay} />
                              </td>
                            ),
                            machine: (
                              <td data-col='machine' data-comment={`${ctx}-limachine-${item.id}`}>
                                <MachineCell
                                  ctx={ctx}
                                  order={order}
                                  item={item}
                                  otherDay={otherDay}
                                  onPick={pickMachine}
                                />
                              </td>
                            ),
                            ...(order.type === 'stock'
                              ? {}
                              : {
                                  stock: otherDay ? (
                                    <td
                                      data-col='stock'
                                      className='mono muted'
                                      data-comment={`${ctx}-listock-${item.id}`}
                                    >
                                      {item.fromStock || 0}
                                    </td>
                                  ) : (
                                    <td data-col='stock' data-comment={`${ctx}-listock-${item.id}`}>
                                      <input
                                        className='field-input'
                                        type='number'
                                        min='0'
                                        max={item.qty}
                                        value={item.fromStock || 0}
                                        placeholder='0'
                                        data-comment={`${ctx}-stockinput-${item.id}`}
                                        onClick={event => event.stopPropagation()}
                                        onChange={event =>
                                          setFromStock(
                                            order.id,
                                            item.id,
                                            Number.parseInt(event.target.value, 10)
                                          )
                                        }
                                      />
                                    </td>
                                  )
                                }),
                            /* Status sits right after Stock — the canvas order */
                            status: (
                              <td data-col='status' data-comment={`${ctx}-listat-${item.id}`}>
                                <LineStatusPill order={order} item={item} />
                              </td>
                            )
                          }
                        : {}),
                      pid: (
                        <td
                          data-col='pid'
                          className='mono'
                          data-comment={`${ctx}-lipid-${item.id}`}
                        >
                          {item.productId}
                        </td>
                      ),
                      desc: (
                        <td
                          data-col='desc'
                          className='trunc'
                          data-comment={`${ctx}-lidesc-${item.id}`}
                        >
                          {editable ? (
                            <input
                              className='field-input'
                              type='text'
                              style={{ width: '100%', fontFamily: 'inherit' }}
                              value={item.description}
                              data-comment={`${ctx}-descinput-${item.id}`}
                              title='Description (editable)'
                              onClick={event => event.stopPropagation()}
                              onChange={event =>
                                setLineField(order.id, item.id, { description: event.target.value })
                              }
                            />
                          ) : (
                            item.description
                          )}
                        </td>
                      ),
                      ...(isScheduled
                        ? {
                            w: (
                              <td
                                data-col='w'
                                className='mono'
                                data-comment={`${ctx}-liw-${item.id}`}
                              >
                                {editable ? (
                                  <input
                                    className='field-input'
                                    type='number'
                                    min='0'
                                    step='0.1'
                                    style={{
                                      width: '48px',
                                      padding: '0 4px',
                                      textAlign: 'center'
                                    }}
                                    value={item.width}
                                    data-comment={`${ctx}-widthinput-${item.id}`}
                                    title='Width in inches (editable)'
                                    onClick={event => event.stopPropagation()}
                                    onChange={event => {
                                      const width = Number.parseFloat(event.target.value)
                                      setLineField(order.id, item.id, {
                                        width: Number.isNaN(width) || width < 0 ? 0 : width
                                      })
                                    }}
                                  />
                                ) : (
                                  item.width.toFixed(1)
                                )}
                              </td>
                            ),
                            l: (
                              <td
                                data-col='l'
                                className={`mono ${item.length !== 120 ? 'len-alert' : ''}`}
                                data-comment={`${ctx}-lil-${item.id}`}
                                title={
                                  item.length !== 120 ? 'Non-standard length (not 120")' : undefined
                                }
                              >
                                {item.length}&quot;
                              </td>
                            )
                          }
                        : {}),
                      notes: <LineNotes ctx={ctx} orderId={order.id} item={item} />
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}
