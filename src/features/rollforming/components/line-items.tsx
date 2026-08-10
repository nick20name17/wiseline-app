import {
  Calendar,
  Check,
  Clock,
  Copy,
  Disc,
  GripVertical,
  List,
  Package,
  Scissors,
  Split
} from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import {
  allCoilsAssignable,
  bulkAssignAvailable,
  orderedLineItems,
  rollCoils,
  stockGateOk,
  supplierName
} from '../selectors'
import {
  copyCoilNumber,
  rollformingStore,
  toggleCoilUnitSelect,
  toggleLineSelect,
  toggleNeedsSlit,
  toggleSortByProductId
} from '../store'
import { openAssign, openBulkAssign } from '../ui'
import { LineNoteButton } from './bits'

import type { LineItem, Order } from '../types'

/**
 * The per-order explosion: one head per line item, then one row per ordered piece.
 *
 * `ctx` is the prototype's own parameter — `uns` on Unscheduled, `sch` on Scheduled — and it scopes
 * every `data-comment` under it. The two contexts are genuinely different screens: Unscheduled picks
 * lines for a split, Scheduled picks *units* for a Supplier/Coil assignment, and after Release both of
 * those give way to See Packages.
 */
type Ctx = 'uns' | 'sch'

/**
 * The Manager's Stock control — two different screens, per the canvas.
 *
 * On Unscheduled it takes a count: how many of the ordered pieces come off the shelf, with the remainder
 * becoming Qty To Produce. On Scheduled the decision moves down to the per-unit `Stock` column, so this
 * becomes a read-only roll-up of those ticks and says nothing at all when none are ticked. Either way a
 * Material Request never has one: it *is* the raw coil.
 */
const StockControl = ({ order, item, ctx }: { order: Order; item: LineItem; ctx: Ctx }) => {
  const role = useStore(rollformingStore, state => state.role)
  if (order.originType === 'material_request') return null

  const fromStock = item.fromStock || 0
  const toProduce = Math.max(0, item.qty - fromStock)
  const summary = fromStock ? `Stock ${fromStock}/${item.qty} · To Produce ${toProduce}` : ''

  if (ctx === 'sch')
    return fromStock ? (
      <span
        className='switch-hint'
        data-comment={`${ctx}-stocklabel-${item.id}`}
        title='Ticked in the Stock column below'
        style={{ marginLeft: '10px' }}
      >
        {summary}
      </span>
    ) : null

  return (
    <label
      className='switch-wrap'
      data-comment={`${ctx}-stockwrap-${item.id}`}
      title='Manager: pull qty from Stock'
      style={{ marginLeft: '10px' }}
    >
      <input
        type='checkbox'
        className='chk'
        data-comment={`${ctx}-stockchk-${item.id}`}
        checked={!!fromStock}
        disabled={order.released || role === 'worker'}
        onChange={() => {}}
      />
      <span className='switch-hint' data-comment={`${ctx}-stocklabel-${item.id}`}>
        {summary || 'Stock'}
      </span>
    </label>
  )
}

/**
 * One row per ordered piece, each assignable its own Supplier and Coil Number.
 *
 * A piece waiting on the Slit Line shows neither: the material it will roll off does not exist yet, so
 * the Supplier reads `locked` and the Coil Number is the waiting tag. A piece coming from stock is not
 * being rolled at all, so it has no slit decision and no Qty To Produce.
 */
const CoilUnitTable = ({ order, item, ctx }: { order: Order; item: LineItem; ctx: Ctx }) => {
  // after Release the assignment is history: the selection column and the Assign buttons both go
  const canBulkSelect = ctx === 'sch' && !order.released
  const state = useStore(rollformingStore, current => current)
  const canTickStock = ctx === 'sch' && stockGateOk(order.id, state)
  const selectedCoilCtx = state.selectedCoilCtx

  return (
    <table className='sub' data-comment={`${ctx}-coiltable-${item.id}`}>
      <thead>
        <tr>
          {canBulkSelect ? <th style={{ width: '26px' }} /> : null}
          <th style={{ width: '56px' }}>Coil</th>
          <th style={{ width: '64px' }}>Stock</th>
          <th style={{ width: '104px' }}>To Produce</th>
          <th style={{ width: '170px' }}>Supplier</th>
          <th style={{ width: '150px' }}>Coil Number</th>
          <th style={{ width: '80px' }}>Slit</th>
          <th style={{ width: '110px' }} />
        </tr>
      </thead>
      <tbody>
        {item.coils.map((coil, index) => {
          const waiting = !coil.stock && coil.needsSlit && !coil.slitDone
          const selected =
            !!selectedCoilCtx &&
            selectedCoilCtx.orderId === order.id &&
            selectedCoilCtx.profile === item.profile &&
            selectedCoilCtx.units.includes(`${item.id}:${index}`)

          return (
            <tr
              key={index}
              className={`${selected ? 'li-selected' : ''}${coil.stock ? ' unit-stock' : ''}`}
              data-comment={`${ctx}-coilrow-${item.id}-${index}`}
            >
              {canBulkSelect ? (
                <td data-comment={`${ctx}-coilchk-${item.id}-${index}`}>
                  {coil.stock ? null : (
                    <input
                      type='checkbox'
                      className='chk'
                      data-comment={`${ctx}-coilchkin-${item.id}-${index}`}
                      checked={selected}
                      onChange={() => toggleCoilUnitSelect(order.id, item.id, index)}
                    />
                  )}
                </td>
              ) : null}
              <td className='mono' data-comment={`${ctx}-coilno-${item.id}-${index}`}>
                #{index + 1}
              </td>
              <td data-comment={`${ctx}-unitstock-${item.id}-${index}`}>
                {canTickStock ? (
                  <input
                    type='checkbox'
                    className='chk'
                    data-comment={`${ctx}-unitstockchk-${item.id}-${index}`}
                    checked={coil.stock}
                    title='Take this coil from Stock — opens Select Supplier / Coil Number'
                    onChange={() => {}}
                  />
                ) : coil.stock ? (
                  <Check style={{ width: '14px', height: '14px', color: 'var(--success)' }} />
                ) : (
                  <span className='subtle'>—</span>
                )}
              </td>
              <td className='mono' data-comment={`${ctx}-unittoproduce-${item.id}-${index}`}>
                {coil.stock ? <span className='subtle'>—</span> : '1'}
              </td>
              <td data-comment={`${ctx}-sup-${item.id}-${index}`}>
                {waiting ? (
                  <span className='subtle' style={{ fontSize: '11px' }}>
                    locked
                  </span>
                ) : (
                  supplierName(coil.supplierId, state.suppliers)
                )}
              </td>
              <td data-comment={`${ctx}-cn-${item.id}-${index}`}>
                {waiting ? (
                  <span className='lock-tag' data-comment={`${ctx}-waiting-${item.id}-${index}`}>
                    <Clock style={{ width: '14px', height: '14px' }} />
                    waiting...
                  </span>
                ) : (
                  <>
                    <span className='mono'>{coil.coilNumber || 'Undefined'}</span>
                    {coil.coilNumber ? (
                      <>
                        {' '}
                        <button
                          className='icon-btn'
                          title='Copy Coil Number'
                          data-comment={`${ctx}-copycn-${item.id}-${index}`}
                          onClick={event => {
                            event.stopPropagation()
                            copyCoilNumber(coil.coilNumber)
                          }}
                        >
                          <Copy style={{ width: '14px', height: '14px' }} />
                        </button>
                      </>
                    ) : null}
                  </>
                )}
              </td>
              <td data-comment={`${ctx}-slit-${item.id}-${index}`}>
                {coil.stock ? (
                  <span className='subtle'>—</span>
                ) : (
                  <button
                    className='icon-btn'
                    title={coil.needsSlit ? 'Needs Slit Line first' : 'Rolls off existing coil'}
                    data-comment={`${ctx}-slitbtn-${item.id}-${index}`}
                    onClick={() => toggleNeedsSlit(order.id, item.id, index)}
                  >
                    {coil.needsSlit ? (
                      <Scissors
                        style={{
                          width: '14px',
                          height: '14px',
                          color: coil.slitDone ? 'var(--success)' : 'var(--pri-by)'
                        }}
                      />
                    ) : (
                      <Disc
                        style={{ width: '14px', height: '14px', color: 'var(--text-subtle)' }}
                      />
                    )}
                  </button>
                )}
              </td>
              <td data-comment={`${ctx}-assignbtn-${item.id}-${index}`}>
                {waiting || order.released ? null : (
                  <button
                    className='btn btn-sm'
                    data-comment={`${ctx}-assignact-${item.id}-${index}`}
                    onClick={() =>
                      openAssign({
                        orderId: order.id,
                        units: [{ lineId: item.id, coilIdx: index }],
                        asCutlist: false
                      })
                    }
                  >
                    Assign
                  </button>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Grouping line items by Product ID also decides what a drag may cross, so it is one control. */
const SortToggle = ({ order, ctx }: { order: Order; ctx: Ctx }) => {
  const on = useStore(rollformingStore, state => !!state.sortByProductId[order.id])
  if (order.lineItems.length < 2) return null

  return (
    <>
      <span className='toolbar-spacer' />
      <button
        className={`btn btn-sm sort-toggle${on ? ' on' : ''}`}
        data-comment={`${ctx}-sortpid-${order.id}`}
        title='Group line items by Product ID'
        onClick={() => toggleSortByProductId(order.id)}
      >
        <List style={{ width: '14px', height: '14px' }} />
        {on ? 'Sorted by Product ID' : 'Sort by Product ID'}
      </button>
    </>
  )
}

/**
 * What a line offers on Scheduled, which Release swaps out wholesale: before it, the two bulk
 * assignment buttons; after it, See Packages. Both bulk buttons stay in the markup but disabled until
 * units of *this line's profile* are ticked — the selection is per profile, because one coil serves one
 * profile. A fully-stock line has nothing to assign, so it gets neither.
 */
const LineToolbar = ({ order, item, ctx }: { order: Order; item: LineItem; ctx: Ctx }) => {
  const selectedCoilCtx = useStore(rollformingStore, state => state.selectedCoilCtx)

  if (order.released)
    return (
      <>
        <span className='toolbar-spacer' />
        <button className='btn btn-sm' data-comment={`${ctx}-seepkg-${item.id}`}>
          <Package style={{ width: '14px', height: '14px' }} />
          See Packages
        </button>
      </>
    )

  if (!rollCoils(item).length) return null

  const selectedForProfile =
    selectedCoilCtx?.orderId === order.id && selectedCoilCtx.profile === item.profile
      ? bulkAssignAvailable(order.id, selectedCoilCtx)
      : 0

  return (
    <>
      <span className='toolbar-spacer' />
      <button
        className='btn btn-sm'
        data-comment={`${ctx}-assign-${item.id}`}
        disabled={!selectedForProfile}
        onClick={() => openBulkAssign(order.id, false)}
      >
        Select Supplier / Coil Number{selectedForProfile ? ` (${selectedForProfile})` : ''}
      </button>
      <button
        className='btn btn-sm'
        data-comment={`${ctx}-cutlist-${item.id}`}
        disabled={!selectedForProfile}
        onClick={() => openBulkAssign(order.id, true)}
      >
        Create Cutlist
      </button>
    </>
  )
}

export const LineItemsSubrow = ({
  order,
  ctx,
  colSpan
}: {
  order: Order
  ctx: Ctx
  colSpan: number
}) => {
  const splitOrderId = useStore(rollformingStore, state => state.splitOrderId)
  const selectedLineIds = useStore(rollformingStore, state => state.selectedLineIds)
  const sortByProductId = useStore(rollformingStore, state => state.sortByProductId)
  const canSplit = ctx === 'uns' && allCoilsAssignable(order)
  const splitCount = splitOrderId === order.id ? selectedLineIds.length : 0

  return (
    <tr className='subrow' data-comment={`${ctx}-subrow-${order.id}`}>
      <td colSpan={colSpan}>
        <div className='subwrap' data-comment={`${ctx}-subwrap-${order.id}`}>
          {canSplit ? (
            <div className='subhead' data-comment={`${ctx}-splithead-${order.id}`}>
              <span className='subhead-title' data-comment={`${ctx}-splittitle-${order.id}`}>
                Line items
              </span>
              <SortToggle order={order} ctx={ctx} />
              <button
                className='btn btn-sm'
                data-comment={`${ctx}-split-${order.id}`}
                disabled={!splitCount}
              >
                <Split style={{ width: '14px', height: '14px' }} />
                Split order{splitCount ? ` (${splitCount})` : ''}
              </button>
            </div>
          ) : ctx === 'sch' ? (
            /* before Release the order is still being reviewed, and rescheduling is part of that */
            <div className='subhead' data-comment={`sch-subhead-${order.id}`}>
              <span className='subhead-title' data-comment={`sch-subtitle-${order.id}`}>
                {order.released ? 'Line items' : 'Reviewing order'}
              </span>
              <SortToggle order={order} ctx={ctx} />
              {order.released ? null : (
                <button
                  className='btn btn-sm'
                  data-pop-anchor
                  data-comment={`sch-reschedule-${order.id}`}
                >
                  <Calendar style={{ width: '14px', height: '14px' }} />
                  Reschedule / Unschedule
                </button>
              )}
            </div>
          ) : null}

          {orderedLineItems(order, sortByProductId).map(({ item, groupBreak }) => {
            const selected =
              canSplit && splitOrderId === order.id && selectedLineIds.includes(item.id)
            // a line already scheduled by an earlier split cannot be split again, or reordered
            const locked = canSplit && !!item.scheduledDate

            return (
              <Fragment key={item.id}>
                {groupBreak ? (
                  <div className='li-pid-divider' data-comment={`${ctx}-piddivider-${item.id}`} />
                ) : null}

                <div
                  className='subhead'
                  data-comment={`${ctx}-lihead-${item.id}`}
                  style={locked ? { opacity: 0.5 } : undefined}
                >
                  <span className='subhead-title' data-comment={`${ctx}-lititle-${item.id}`}>
                    {locked ? null : (
                      <>
                        <span
                          className='li-drag-handle'
                          draggable
                          title='Drag to reorder'
                          data-comment={`${ctx}-lidrag-${item.id}`}
                        >
                          <GripVertical style={{ width: '14px', height: '14px' }} />
                        </span>{' '}
                      </>
                    )}
                    {canSplit ? (
                      <input
                        type='checkbox'
                        className='chk'
                        style={{ marginRight: '8px' }}
                        data-comment={`${ctx}-lichk-${item.id}`}
                        checked={selected}
                        disabled={locked}
                        onChange={() => toggleLineSelect(order.id, item.id)}
                      />
                    ) : null}
                    <span className='chip profile' data-comment={`${ctx}-lichip-${item.id}`}>
                      {item.profile}
                    </span>{' '}
                    <span
                      className='mono subtle'
                      data-comment={`${ctx}-lipid-${item.id}`}
                      style={{ fontSize: '11px' }}
                    >
                      {item.productId}
                    </span>
                    {/* space · nbsp · space, exactly as the prototype writes it — JSX would eat one */}
                    {' \u00a0 '}
                    {`${item.qty} × ${item.gauge}ga ${item.color} · ${item.width}" wide${
                      item.length
                        ? ` · ${item.length}" long`
                        : item.linearFeet
                          ? ` · ${item.linearFeet} ln ft`
                          : ''
                    }`}
                    {locked ? (
                      <span className='subtle' style={{ marginLeft: '8px', fontSize: '11px' }}>
                        scheduled {fmtDate(item.scheduledDate)}
                      </span>
                    ) : null}
                  </span>

                  <StockControl order={order} item={item} ctx={ctx} />
                  {ctx === 'sch' ? <LineToolbar order={order} item={item} ctx={ctx} /> : null}
                  <LineNoteButton order={order} item={item} comment={`${ctx}-linote-${item.id}`} />
                </div>

                <CoilUnitTable order={order} item={item} ctx={ctx} />
                {rollCoils(item).length ? null : (
                  <div
                    className='subtle'
                    data-comment={`${ctx}-nocoils-${item.id}`}
                    style={{ padding: '0 2px 12px', fontSize: '11.5px' }}
                  >
                    Fully from stock — nothing to roll.
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      </td>
    </tr>
  )
}
