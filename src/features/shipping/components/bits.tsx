import {
  Check,
  Circle,
  CircleCheck,
  Inbox,
  List,
  Lock,
  MapPin,
  MessageSquare,
  Package,
  Truck
} from 'lucide-react'

import { useStore } from '@/store/create-store'

import { usePopover } from '@/components/shell/pop'

import {
  barcodeFor,
  lineMeta,
  loadStatusCls,
  loadStatusLabel,
  noteState,
  pkgMeta,
  priorityById
} from '../selectors'
import { markDelivered, setPriority, shippingStore } from '../store'
import { openMapDetail, openOrderNotes } from '../ui'

import type { Order } from '../types'

/** The pieces every view of this page reuses. Each is one render function in the prototype. */

export const EmptyState = ({
  title,
  text,
  commentKey
}: {
  title: string
  text: string
  commentKey?: string
}) => {
  const key =
    commentKey ??
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  return (
    <div className='table-wrap' data-comment={`empty-wrap-${key}`}>
      <div className='empty' data-comment={`empty-state-${key}`}>
        <Inbox data-comment={`empty-icon-${key}`} className='empty-ico' />
        <h3 data-comment={`empty-title-${key}`}>{title}</h3>
        <p data-comment={`empty-text-${key}`}>{text}</p>
      </div>
    </div>
  )
}

/** Priority is the Manager's and the Shipping Manager's; Workers and Drivers read it and work to it. */
export const PriorityCell = ({ order }: { order: Order }) => {
  const role = useStore(shippingStore, state => state.role)
  const priorities = useStore(shippingStore, state => state.priorities)
  const { openPop, popNode } = usePopover()
  const readOnly = role === 'worker'
  const priority = priorityById(order.priorityId, priorities)

  return (
    <>
      <button
        className={`pri ${priority ? priority.cls : 'pri-none'}${readOnly ? ' readonly' : ''}`}
        {...(readOnly
          ? { title: 'Manager or Shipping Manager only' }
          : { 'data-pop-anchor': true })}
        data-comment={`pri-${order.id}`}
        onClick={
          readOnly
            ? undefined
            : event => {
                event.stopPropagation()
                openPop<number>(
                  event.currentTarget,
                  [
                    ...priorities.map(entry => ({ label: entry.name, value: entry.id })),
                    { label: 'No priority', value: 0 }
                  ],
                  value => setPriority(order.id, value || null),
                  order.priorityId ?? 0
                )
              }
        }
      >
        <span className='pri-dot' />
        {priority ? priority.name : readOnly ? 'No priority' : 'Set priority'}
      </button>
      {popNode}
    </>
  )
}

export const NotesButton = ({ order }: { order: Order }) => {
  const state = noteState(order.notes)

  return (
    <button
      className={`note-btn ${state === 'unread' ? 'has-unread' : state === 'read' ? 'all-read' : ''}`}
      data-comment={`notes-${order.id}`}
      onClick={event => {
        event.stopPropagation()
        openOrderNotes(order.id)
      }}
      title='Order notes'
    >
      <MessageSquare style={{ width: '14px', height: '14px' }} />
      {state !== 'none' ? <span className='note-dot' /> : null}
    </button>
  )
}

export const MapButton = ({ order }: { order: Order }) => (
  <button
    className='map-btn'
    data-comment={`map-${order.id}`}
    onClick={event => {
      event.stopPropagation()
      openMapDetail(order.id)
    }}
    title='View on map'
  >
    <MapPin style={{ width: '14px', height: '14px' }} />
  </button>
)

export const ShipViaCell = ({ order }: { order: Order }) => (
  <span className='shipvia' data-comment={`shipvia-${order.id}`}>
    <Truck style={{ width: '14px', height: '14px' }} />
    {order.shipVia}
  </span>
)

export const OrderStatusPill = ({ order }: { order: Order }) => {
  if (order.status === '')
    return (
      <span className='status ss-blank' data-comment={`stat-${order.id}`}>
        —
      </span>
    )

  return (
    <span className={`status ${loadStatusCls(order.status)}`} data-comment={`stat-${order.id}`}>
      <span className='st-dot' />
      {loadStatusLabel(order.status)}
    </span>
  )
}

/** With Toggle Notes on, one peek row under every order that has a note. */
export const NotePreviewRow = ({
  order,
  ctx,
  colSpan
}: {
  order: Order
  ctx: string
  colSpan: number
}) => {
  if (!order.notes?.length) return null

  const last = order.notes[order.notes.length - 1]
  const unread = order.notes.some(note => !note.dealt)

  return (
    <tr className='noterow' data-comment={`${ctx}-noterow-${order.id}`}>
      <td colSpan={colSpan}>
        <button
          className={`note-peek ${unread ? 'unread' : ''}`}
          data-comment={`${ctx}-notepeek-${order.id}`}
          onClick={() => openOrderNotes(order.id)}
        >
          <MessageSquare style={{ width: '14px', height: '14px' }} />
          <span className='np-txt'>
            <b>{last?.author}:</b> {last?.body}
          </span>
        </button>
      </td>
    </tr>
  )
}

/** The order's contents. The totals row is the order's own weight and length, not the lines' sum. */
export const LineItemsTable = ({ order, ctx }: { order: Order; ctx: string }) => {
  const items = lineMeta(order)

  return (
    <>
      <div className='exp-li-cap' data-comment={`${ctx}-licap-${order.id}`}>
        <List style={{ width: '13px', height: '13px' }} />
        Line items · {items.length}
      </div>
      <table className='pkg-table' data-comment={`${ctx}-litable-${order.id}`}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Description</th>
            <th>Gauge / Color</th>
            <th className='num'>Qty</th>
            <th className='num'>Weight</th>
            <th className='num'>Longest</th>
          </tr>
        </thead>
        <tbody data-comment={`${ctx}-litbody-${order.id}`}>
          {items.map((item, index) => (
            <tr key={index} data-comment={`${ctx}-li-${order.id}-${index}`}>
              <td className='cell-order' data-comment={`${ctx}-lipid-${order.id}-${index}`}>
                {item.productId}
              </td>
              <td data-comment={`${ctx}-lidesc-${order.id}-${index}`}>{item.description}</td>
              <td data-comment={`${ctx}-ligc-${order.id}-${index}`}>
                {item.gauge ? `${item.gauge} · ${item.color}` : <span className='subtle'>—</span>}
              </td>
              <td className='num' data-comment={`${ctx}-liqty-${order.id}-${index}`}>
                {item.qty}
              </td>
              <td className='num' data-comment={`${ctx}-liwt-${order.id}-${index}`}>
                {item.weight.toLocaleString('en-US')} lb
              </td>
              <td className='num' data-comment={`${ctx}-lilen-${order.id}-${index}`}>
                {item.length ? `${item.length}"` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className='li-total' data-comment={`${ctx}-litotal-${order.id}`}>
            <td colSpan={3}>Total</td>
            <td className='num'>{items.reduce((total, item) => total + item.qty, 0)}</td>
            <td className='num'>{order.weight.toLocaleString('en-US')} lb</td>
            <td className='num'>{order.longestLength}"</td>
          </tr>
        </tfoot>
      </table>
    </>
  )
}

/**
 * How the order is packed, shown when a Loading row is expanded.
 *
 * Read-only: the ticks come from the warehouse scanning packages at the Loading station, not from
 * anyone clicking here, and once the load is en route the column heading turns into a padlock to say
 * that what went on the truck is now settled. `Mark Delivered` is the one thing this view can do.
 */
export const PackageExpandRow = ({
  order,
  ctx,
  colSpan
}: {
  order: Order
  ctx: string
  colSpan: number
}) => {
  const locked = order.status === 'shipping' || order.status === 'delivered'
  const packages = pkgMeta(order)

  return (
    <tr className='subrow' data-comment={`${ctx}-pkgsubrow-${order.id}`}>
      <td colSpan={colSpan}>
        <div className='subwrap' data-comment={`${ctx}-pkgsubwrap-${order.id}`}>
          <div
            data-comment={`${ctx}-pkgcap-${order.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--text-subtle)',
              padding: '2px 2px 6px 2px'
            }}
          >
            <Package style={{ width: '14px', height: '14px' }} />
            {locked
              ? 'Packages that were loaded onto the truck — locked once the load is en route'
              : 'Packages load as the warehouse scans them at the Loading station — read-only overview'}
          </div>
          <table className='pkg-table' data-comment={`${ctx}-pkgtable-${order.id}`}>
            <thead>
              <tr>
                <th className='pkg-chkcell'>
                  {locked ? <Lock style={{ width: '14px', height: '14px' }} /> : 'Load'}
                </th>
                <th>Package</th>
                <th>Type</th>
                <th>Contents</th>
                <th className='num'>Pcs</th>
                <th className='num'>Weight</th>
                <th className='num'>Longest</th>
              </tr>
            </thead>
            <tbody data-comment={`${ctx}-pkgtbody-${order.id}`}>
              {packages.map((meta, index) => (
                <tr
                  className={meta.loaded ? 'is-loaded' : ''}
                  data-comment={`${ctx}-pkg-${order.id}-${index}`}
                  key={index}
                >
                  <td className='pkg-chkcell'>
                    <span
                      className={`pkg-status ${meta.loaded ? 'is-loaded' : ''}`}
                      data-comment={`${ctx}-pkgstatus-${order.id}-${index}`}
                      title={meta.loaded ? 'Loaded onto the truck' : 'Not yet loaded'}
                    >
                      {meta.loaded ? (
                        <CircleCheck style={{ width: '14px', height: '14px' }} />
                      ) : (
                        <Circle style={{ width: '14px', height: '14px' }} />
                      )}
                    </span>
                  </td>
                  <td>
                    <span className='pkg-name'>Package {index + 1}</span>
                    <span className='pkg-bc' data-comment={`${ctx}-pkgbc-${order.id}-${index}`}>
                      {barcodeFor(order.order, index + 1)}
                    </span>
                  </td>
                  <td>{meta.type}</td>
                  <td>{meta.contents}</td>
                  <td className='num'>{meta.pcs}</td>
                  <td className='num'>{meta.weight.toLocaleString('en-US')} lb</td>
                  <td className='num'>{meta.length}&quot;</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.status === 'shipping' ? (
            <button
              className='btn btn-primary btn-sm'
              data-comment={`${ctx}-deliver-${order.id}`}
              onClick={() => markDelivered(order.id)}
            >
              <Check style={{ width: '14px', height: '14px' }} />
              Mark Delivered
            </button>
          ) : order.status === 'delivered' ? (
            <span className='status ss-delivered' data-comment={`${ctx}-delivered-${order.id}`}>
              <span className='st-dot' />
              Delivered
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

/** What an expanded order shows: the address in full, how it ships, what is on it. */
export const ExpandRow = ({
  order,
  ctx,
  colSpan
}: {
  order: Order
  ctx: string
  colSpan: number
}) => {
  const notesExpanded = useStore(shippingStore, state => state.notesExpanded)
  const last = order.notes?.[order.notes.length - 1]

  return (
    <tr className='subrow' data-comment={`${ctx}-subrow-${order.id}`}>
      <td colSpan={colSpan}>
        <div className='subwrap' data-comment={`${ctx}-subwrap-${order.id}`}>
          <div className='exp-grid' data-comment={`${ctx}-expgrid-${order.id}`}>
            <div>
              <span className='exp-label'>Full address</span>
              <div className='exp-val' data-comment={`${ctx}-fulladdr-${order.id}`}>
                {order.address}, {order.city}
              </div>
            </div>
            <div>
              <span className='exp-label'>Ship via</span>
              <div className='exp-val' data-comment={`${ctx}-fullvia-${order.id}`}>
                {order.shipVia}
                {order.pickup ? ' · Supplier pickup' : ''}
              </div>
            </div>
            <div>
              <span className='exp-label'>Weight / Longest length</span>
              <div className='exp-val mono' data-comment={`${ctx}-fullwl-${order.id}`}>
                {order.weight.toLocaleString('en-US')} lb / {order.longestLength}"
              </div>
            </div>
          </div>

          <LineItemsTable order={order} ctx={ctx} />

          {notesExpanded && last ? (
            <div className='exp-note' data-comment={`${ctx}-notepreview-${order.id}`}>
              <b>{last.author}:</b> {last.body}
            </div>
          ) : null}
        </div>
      </td>
    </tr>
  )
}
