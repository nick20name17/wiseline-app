import {
  Calendar,
  CalendarDays,
  CalendarX,
  ChevronDown,
  CornerDownRight,
  Lock,
  MessageSquare,
  Split
} from 'lucide-react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import { lineDay, machineById, noteState, qtyToMake, ventedOf } from '../selectors'
import { toggleLineSelect, trimStore } from '../store'
import { confirmUnschedule, openNotes, openSchedule } from '../ui'
import { LineStatusPill } from './bits'

import type { LineItem, Order } from '../types'

/**
 * The line items under an expanded order — one component for both tabs, as it is one function in the
 * prototype. The two contexts are not two designs: Scheduled is Unscheduled plus the columns a
 * Manager reviews an order through (vented, machine, stock, status, width, length), so splitting them
 * would mean maintaining the shared eight columns twice.
 */

type Context = 'uns' | 'sch'

const LineNotes = ({ ctx, orderId, item }: { ctx: Context; orderId: number; item: LineItem }) => {
  const state = noteState(item.notes)

  return (
    <td data-comment={`${ctx}-linote-${item.id}`}>
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
  if (order.released)
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
        readOnly
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
          readOnly
        />
      ) : null}
    </label>
  )
}

const MachineCell = ({
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
const SubHead = ({ order, ctx }: { order: Order; ctx: Context }) => {
  const splitOrderId = useStore(trimStore, state => state.splitOrderId)
  const selectedLineIds = useStore(trimStore, state => state.selectedLineIds)

  if (ctx === 'sch') {
    if (order.released) return null

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
              current: order.productionDate
            })
          }
        >
          <Calendar style={{ width: '14px', height: '14px' }} />
          Reschedule
        </button>
        <button
          className='btn btn-sm'
          data-comment={`sch-unschedule-${order.id}`}
          onClick={() => confirmUnschedule(order.id, order.order)}
        >
          <CalendarX style={{ width: '14px', height: '14px' }} />
          Unschedule
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
        <span className='split-head-hint' data-comment={`uns-splithint-${order.id}`}>
          {splitCount ? (
            <>
              <b>{splitCount}</b> line item{splitCount > 1 ? 's' : ''} picked — schedule them to
              their own day.
            </>
          ) : (
            'Tick line items below to schedule part of this order on a different day.'
          )}
        </span>
      </span>
      <button
        className='btn btn-sm'
        data-comment={`uns-split-${order.id}`}
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

  return (
    <tr className='subrow' data-comment={`${ctx}-subrow-${order.id}`}>
      <td colSpan={isScheduled ? 11 : 8}>
        <div className='subwrap' data-comment={`${ctx}-subwrap-${order.id}`}>
          {/* #171: name the owning order above its line items */}
          <div className='li-owner' data-comment={`${ctx}-liowner-${order.id}`}>
            <CornerDownRight style={{ width: '13px', height: '13px' }} />
            Line items of{' '}
            <span className='li-owner-order' data-comment={`${ctx}-liowner-order-${order.id}`}>
              {order.order}
            </span>
            <span data-comment={`${ctx}-liowner-cust-${order.id}`}>&nbsp;· {order.customer}</span>
            <span className='li-owner-count' data-comment={`${ctx}-liowner-count-${order.id}`}>
              {order.lineItems.length} line item{order.lineItems.length > 1 ? 's' : ''}
            </span>
          </div>

          <SubHead order={order} ctx={ctx} />

          <table className='sub' data-comment={`${ctx}-litable-${order.id}`}>
            <thead>
              <tr>
                <th style={{ width: '30px' }} />
                <th style={{ width: '60px' }}>Qty</th>
                {isScheduled ? (
                  <>
                    <th style={{ width: '72px' }}>Vented</th>
                    <th style={{ width: '128px' }}>Machine</th>
                    {/* N-032: a stock order has no «# From Stock» to take from */}
                    {order.type !== 'stock' ? <th style={{ width: '80px' }}>Stock</th> : null}
                    <th style={{ width: '116px' }}>Status</th>
                  </>
                ) : null}
                <th style={{ width: '116px' }}>Product ID</th>
                <th>Description</th>
                {isScheduled ? (
                  <>
                    <th style={{ width: '54px' }}>W&quot;</th>
                    <th style={{ width: '54px' }}>L&quot;</th>
                  </>
                ) : null}
                <th style={{ width: '48px' }}>Notes</th>
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
                const editable = isScheduled && !order.released && !otherDay

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
                    <td className='cell-num' data-comment={`${ctx}-liqty-${item.id}`}>
                      {item.qty}
                    </td>

                    {isScheduled ? (
                      <>
                        <td data-comment={`${ctx}-livent-${item.id}`}>
                          <VentCell ctx={ctx} order={order} item={item} otherDay={otherDay} />
                        </td>
                        <td data-comment={`${ctx}-limachine-${item.id}`}>
                          <MachineCell ctx={ctx} order={order} item={item} otherDay={otherDay} />
                        </td>
                        {order.type !== 'stock' ? (
                          otherDay ? (
                            <td className='mono muted' data-comment={`${ctx}-listock-${item.id}`}>
                              {item.fromStock || 0}
                            </td>
                          ) : (
                            <td data-comment={`${ctx}-listock-${item.id}`}>
                              <input
                                className='field-input'
                                type='number'
                                min='0'
                                max={item.qty}
                                value={item.fromStock || 0}
                                placeholder='0'
                                data-comment={`${ctx}-stockinput-${item.id}`}
                                readOnly
                              />
                            </td>
                          )
                        ) : null}
                        {/* Status sits right after Stock — the canvas order */}
                        <td data-comment={`${ctx}-listat-${item.id}`}>
                          <LineStatusPill order={order} item={item} />
                        </td>
                      </>
                    ) : null}

                    <td className='mono' data-comment={`${ctx}-lipid-${item.id}`}>
                      {item.productId}
                    </td>
                    <td className='trunc' data-comment={`${ctx}-lidesc-${item.id}`}>
                      {editable ? (
                        <input
                          className='field-input'
                          type='text'
                          style={{ width: '100%', fontFamily: 'inherit' }}
                          value={item.description}
                          data-comment={`${ctx}-descinput-${item.id}`}
                          title='Description (editable)'
                          readOnly
                        />
                      ) : (
                        item.description
                      )}
                    </td>

                    {isScheduled ? (
                      <>
                        <td className='mono' data-comment={`${ctx}-liw-${item.id}`}>
                          {editable ? (
                            <input
                              className='field-input'
                              type='number'
                              min='0'
                              step='0.1'
                              style={{ width: '48px', padding: '0 4px', textAlign: 'center' }}
                              value={item.width}
                              data-comment={`${ctx}-widthinput-${item.id}`}
                              title='Width in inches (editable)'
                              readOnly
                            />
                          ) : (
                            item.width.toFixed(1)
                          )}
                        </td>
                        <td
                          className={`mono ${item.length !== 120 ? 'len-alert' : ''}`}
                          data-comment={`${ctx}-lil-${item.id}`}
                          title={item.length !== 120 ? 'Non-standard length (not 120")' : undefined}
                        >
                          {item.length}&quot;
                        </td>
                      </>
                    ) : null}

                    <LineNotes ctx={ctx} orderId={order.id} item={item} />
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
