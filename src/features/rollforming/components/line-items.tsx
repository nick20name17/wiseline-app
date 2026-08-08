import { Check, Clock, Copy, Disc, GripVertical, List, Scissors, Split } from 'lucide-react'

import { Fragment } from 'react'

import { useStore } from '@/store/create-store'

import { fmtDate } from '../format'
import { allCoilsAssignable, orderedLineItems, rollCoils, supplierName } from '../selectors'
import { rollformingStore, toggleLineSelect, toggleSortByProductId } from '../store'
import { LineNoteButton } from './bits'

import type { LineItem, Order } from '../types'

/**
 * The per-order explosion: one head per line item, then one row per ordered piece.
 *
 * `ctx` is the prototype's own parameter — `uns` on Unscheduled, `sch` on Scheduled — and it scopes
 * every `data-comment` under it. Only `uns` is wired today; the Scheduled context adds the bulk
 * Supplier/Coil selection and the per-unit Stock ticks, and lands with that view.
 */
type Ctx = 'uns' | 'sch'

/**
 * The Manager's Stock control. On Unscheduled it takes a count — how many of the ordered pieces come
 * off the shelf — and the remainder becomes Qty To Produce. It locks once the order is released, and a
 * Material Request never has one: it *is* the raw coil.
 */
const StockControl = ({ order, item, ctx }: { order: Order; item: LineItem; ctx: Ctx }) => {
  if (order.originType === 'material_request') return null

  const fromStock = item.fromStock || 0
  const toProduce = Math.max(0, item.qty - fromStock)
  const summary = fromStock ? `Stock ${fromStock}/${item.qty} · To Produce ${toProduce}` : ''

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
        disabled={order.released || rollformingStore.get().role === 'worker'}
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
const CoilUnitTable = ({ order, item, ctx }: { order: Order; item: LineItem; ctx: Ctx }) => (
  <table className='sub' data-comment={`${ctx}-coiltable-${item.id}`}>
    <thead>
      <tr>
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

        return (
          <tr
            key={index}
            className={coil.stock ? 'unit-stock' : ''}
            data-comment={`${ctx}-coilrow-${item.id}-${index}`}
          >
            <td className='mono' data-comment={`${ctx}-coilno-${item.id}-${index}`}>
              #{index + 1}
            </td>
            <td data-comment={`${ctx}-unitstock-${item.id}-${index}`}>
              {coil.stock ? (
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
                supplierName(coil.supplierId)
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
                        onClick={event => event.stopPropagation()}
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
                    <Disc style={{ width: '14px', height: '14px', color: 'var(--text-subtle)' }} />
                  )}
                </button>
              )}
            </td>
            <td data-comment={`${ctx}-assignbtn-${item.id}-${index}`}>
              {waiting || order.released ? null : (
                <button
                  className='btn btn-sm'
                  data-comment={`${ctx}-assignact-${item.id}-${index}`}
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
          ) : null}

          {orderedLineItems(order).map(({ item, groupBreak }) => {
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
                  <LineNoteButton item={item} comment={`${ctx}-linote-${item.id}`} />
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
