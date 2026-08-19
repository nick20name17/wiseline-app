import { Ban, Check, MapPin, MessageSquare, Package, Printer, RefreshCw } from 'lucide-react'

import { useState } from 'react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'
import { maxPackageWeight } from '@/store/shared/settings'

import { fmtDate } from '../format'
import {
  activeLocationId,
  demoPo,
  demoSalesman,
  estWeight,
  isLocationLockedForOrder,
  isLocationOverWeight,
  isOverdue,
  lineStatus,
  locById,
  locCurrentWeight,
  noteState,
  orderLocLabel,
  priorityById,
  productionStatus,
  wrapEligible,
  wrapLeftOf
} from '../selectors'
import { completeOrder, createPackage, DEPARTMENT, trimStore } from '../store'
import {
  askConfirm,
  closeConfirm,
  openLocPicker,
  openNotes,
  openPackages,
  openPad,
  pickLocation,
  showToast
} from '../ui'
import { StockWrapWindow } from './stock-wrap'

import type { LineItem, Order } from '../types'

/** N-166/#114: the wrapping window's columns move, and the order is kept per person. */
const DATA_COLUMNS: Column[] = [
  { key: 'pid', label: 'Product ID', width: '120px' },
  { key: 'desc', label: 'Description' },
  { key: 'len', label: 'Length', width: '70px' },
  { key: 'qty', label: 'Qty', width: '60px' },
  { key: 'stock', label: 'Stock', width: '72px' },
  { key: 'left', label: 'Left To Wrap', width: '70px' },
  { key: 'status', label: 'Status', width: '116px' },
  { key: 'rem', label: 'Remanufacture', width: '118px' },
  { key: 'wrapping', label: 'Wrapping', width: '210px' },
  { key: 'notes', label: 'Notes', width: '96px' }
]

const PRODUCTION_STATUS: Record<string, [string, string]> = {
  stock: ['st-stock', 'Stock'],
  not_started: ['st-notstarted', 'Not Started'],
  in_progress: ['st-inprogress', 'In Progress'],
  cut: ['st-cut', 'Cut'],
  bent: ['st-bent', 'Bent'],
  wrapped: ['st-wrapped', 'Wrapped'],
  bypassed: ['st-bypassed', 'Bypassed']
}

const StatusPill = ({ status, comment }: { status: string | null; comment: string }) => {
  const [cls, label] = PRODUCTION_STATUS[status ?? ''] ?? PRODUCTION_STATUS.not_started!

  return (
    <span className={`status ${cls}`} data-comment={comment}>
      <span className='st-dot' />
      {label}
    </span>
  )
}

/**
 * Screenshot 08's order-info block: Customer · Order # · PO# · Salesman · Ship Date · Ship Via ·
 * Priority · Trim Location. #187 made this the only place Trim Location appears on the wrapping
 * screen — it belongs to the order, not to each package.
 */
export const OrderInfoBlock = ({
  order,
  prefix,
  location
}: {
  order: Order
  prefix: string
  location?: React.ReactNode
}) => {
  const priority = priorityById(order.priorityId)
  const isStock = order.type === 'stock'

  const pairs: [string, React.ReactNode][] = [
    ['Customer Name', isStock ? 'Stock' : order.customer],
    ['Order #', order.order],
    ['PO#', isStock ? 'N/A' : demoPo(order.order)],
    ['Salesman', isStock ? 'N/A' : demoSalesman(order.order)],
    ['Ship Date', order.shipDate ? fmtDate(order.shipDate) : 'N/A'],
    ['Ship Via', isStock ? 'N/A' : 'Delivery'],
    ['Priority', priority ? priority.name : '—'],
    ['Trim Location', isStock ? 'N/A' : (location ?? orderLocLabel(order))]
  ]

  return (
    <div className='wrap-footer' data-comment={`${prefix}-wrap`}>
      {pairs.map(([label, value], index) => (
        <div className='wrap-foot-item' key={label} data-comment={`${prefix}-${index}`}>
          <span className='wrap-foot-label' data-comment={`${prefix}-l-${index}`}>
            {label}
          </span>
          <span className='wrap-foot-val' data-comment={`${prefix}-v-${index}`}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

/** The removable location chips, each with its own auto-release countdown. */
const LocationTags = ({ order }: { order: Order }) => {
  const ids = order.locationIds ?? []
  if (!ids.length)
    return (
      <span className='subtle' style={{ fontSize: '11px' }} data-comment={`wrap-noloc-${order.id}`}>
        No location assigned
      </span>
    )

  return (
    <>
      {ids.map(id => {
        const location = locById(id)
        if (!location) return null

        return (
          <span className='loc-tag-wrap' key={id} data-comment={`loctagwrap-${order.id}-${id}`}>
            <button
              className={`loc-tag ${isLocationOverWeight(location) ? 'over' : isLocationLockedForOrder(order, id) ? 'locked' : ''}`}
              data-comment={`loctag-${order.id}-${id}`}
              title={
                isLocationLockedForOrder(order, id)
                  ? 'Locked — full, do not add more packages here'
                  : 'Click to remove this location'
              }
              onClick={event => {
                event.stopPropagation()
                pickLocation(order, id, location.code)
              }}
            >
              {location.code}
            </button>
          </span>
        )
      })}
    </>
  )
}

/**
 * The package builder an order drills into from the Wrapping list, and the three gates it walks:
 * a quantity opens Select location, a location opens Create & print, and only every line wrapped
 * opens Order Complete.
 */
export const WrapOrderDetail = ({ order }: { order: Order }) => {
  const { remans } = useStore(trimStore, current => current)
  // the draft quantities are the operator's scratch pad, cleared by printing rather than persisted
  const [draft, setDraft] = useState<Record<number, string>>({})
  // before the stock branch below: a hook cannot sit behind an early return
  const { headers, cells } = useColumnOrder('trim-wrapdetail', DATA_COLUMNS, { notify: showToast })

  if (order.type === 'stock') return <StockWrapWindow order={order} />

  const stagedQty = (item: LineItem) => {
    const raw = draft[item.id]
    const parsed = raw === undefined || raw === '' ? 0 : parseInt(raw, 10)
    return Math.min(Number.isNaN(parsed) || parsed < 0 ? 0 : parsed, wrapLeftOf(item))
  }

  const staged = order.lineItems.filter(item => wrapEligible(order, item) && stagedQty(item) > 0)
  const draftWeight = staged.reduce((sum, item) => sum + stagedQty(item) * estWeight(item), 0)

  const total = order.lineItems.reduce((sum, item) => sum + item.qty, 0)
  const wrapped = order.lineItems.reduce((sum, item) => sum + (item.wrapped || 0), 0)
  const overdue = isOverdue(order.productionDate) && wrapped < total
  const packageCount = (order.packages ?? []).filter(pkg => !pkg.deleted).length

  const activeLoc = locById(activeLocationId(order) ?? -1)
  const canSelectLoc = staged.length > 0
  const canCreate = canSelectLoc && (order.locationIds ?? []).length > 0
  const canComplete = productionStatus(order) === 'complete'

  const maxPkg = maxPackageWeight(DEPARTMENT)
  const overPkg = maxPkg > 0 && draftWeight > maxPkg
  const overLoc =
    !!activeLoc &&
    draftWeight > 0 &&
    locCurrentWeight(activeLoc) + draftWeight > (activeLoc.maxWeight as number)

  const batchQty = order.lineItems.reduce(
    (sum, item) => sum + Math.max(0, item.qty - (item.fromStock || 0)),
    0
  )

  /**
   * These take the location rather than closing over `activeLoc`.
   *
   * The React Compiler lifts a property read out of a callback into the render-time dependency check
   * it builds for that callback, so an `activeLoc!.code` written inside one of these runs on *every*
   * render — and an order that has not picked a location yet has no `activeLoc` to read. The
   * parameter keeps the read where it was written.
   */
  const finalize = (location: { id: number; code: string }) => {
    const pkg = createPackage(
      order.id,
      location.id,
      staged.map(item => ({ lineId: item.id, qty: stagedQty(item) })),
      draftWeight
    )
    if (!pkg) return

    setDraft(current => {
      const next = { ...current }
      for (const item of staged) delete next[item.id]
      return next
    })
    showToast(`Printed label ${pkg.barcode}  ·  ${pkg.qty} pcs → ${location.code}`)
  }

  /**
   * Both weight limits are soft, and independent: overriding the package one still has to clear the
   * cell's, so the two questions are asked in turn rather than merged into one.
   */
  const confirmLocWeight = (location: { id: number; code: string; maxWeight: number }) => {
    if (!overLoc) return finalize(location)

    askConfirm(
      'Location over weight limit',
      `${location.code} would exceed ${location.maxWeight} lb (soft limit). Print anyway?`,
      () => {
        closeConfirm()
        finalize(location)
      },
      'Print anyway'
    )
  }

  const print = () => {
    if (!staged.length) return showToast('Enter a wrapping quantity first', 'warning')
    if (!activeLoc) return showToast('Select a location first', 'warning')

    const location = {
      id: activeLoc.id,
      code: activeLoc.code,
      maxWeight: activeLoc.maxWeight as number
    }

    if (overPkg)
      return askConfirm(
        'Package over the weight limit',
        `${draftWeight} lb exceeds the ${maxPkg} lb limit set for Trim in Settings › Machines. Wrap fewer pieces into this package, or print anyway.`,
        () => {
          closeConfirm()
          confirmLocWeight(location)
        },
        'Print anyway'
      )

    confirmLocWeight(location)
  }

  return (
    <div className='bendlist' data-comment={`wrap-order-${order.id}`}>
      <div
        className='bendlist-head'
        data-comment={`wrap-head-${order.id}`}
        style={overdue ? { background: 'var(--overdue-soft)' } : undefined}
      >
        <span className='cell-order' data-comment={`wrap-ono-${order.id}`}>
          {order.order}
        </span>
        <span className='subtle' data-comment={`wrap-cust-${order.id}`}>
          {order.customer}
        </span>
        {overdue ? (
          <span
            className='split-badge'
            style={{
              color: 'var(--danger)',
              background: 'var(--danger-soft)',
              borderColor: 'var(--danger)'
            }}
            data-comment={`wrap-overdue-${order.id}`}
          >
            Overdue
          </span>
        ) : null}
        <span className='toolbar-spacer' />
        <span
          className='mono subtle'
          data-comment={`wrap-prog-${order.id}`}
          style={{ fontSize: '11px' }}
        >
          {wrapped} / {total} wrapped
        </span>
      </div>

      <table
        className='sub'
        data-comment={`wrap-table-${order.id}`}
        style={{ border: 'none', borderRadius: 0 }}
      >
        <thead>
          <tr>{headers}</tr>
        </thead>
        <tbody>
          {order.lineItems.map((item, index) => {
            const key = `${order.id}-${index}`
            const status = item.status || lineStatus(order, item)
            const left = wrapLeftOf(item)
            const eligible = wrapEligible(order, item)
            const lineRemans = remans.filter(
              reman => reman.orderId === order.id && reman.lineId === item.id
            )
            const stockLocked = item.status === 'wrapped' || order.completed

            return (
              <tr key={item.id} data-comment={`wrap-row-${key}`}>
                {cells({
                  pid: (
                    <td data-col='pid' className='mono' data-comment={`wrap-pid-${key}`}>
                      {item.productId}
                    </td>
                  ),
                  desc: (
                    <td data-col='desc' className='trunc' data-comment={`wrap-desc-${key}`}>
                      {item.description}
                    </td>
                  ),
                  len: (
                    <td
                      data-col='len'
                      className={`mono ${item.length !== 120 ? 'len-alert' : ''}`}
                      data-comment={`wrap-len-${key}`}
                    >
                      {item.length}&quot;
                    </td>
                  ),
                  qty: (
                    <td data-col='qty' className='mono' data-comment={`wrap-qty-${key}`}>
                      {item.qty}
                    </td>
                  ),
                  stock: (
                    <td data-col='stock' data-comment={`wrap-stockcell-${key}`}>
                      <button
                        className='field-btn'
                        style={{ minWidth: '52px', justifyContent: 'center' }}
                        disabled={stockLocked}
                        title={stockLocked ? 'Locked — line already wrapped' : undefined}
                        data-comment={`wrap-stockbtn-${key}`}
                        onClick={() =>
                          openPad({
                            kind: 'stock',
                            orderId: order.id,
                            lineId: item.id,
                            locked: !!stockLocked
                          })
                        }
                      >
                        {item.fromStock || 0}
                      </button>
                    </td>
                  ),
                  left: (
                    <td
                      data-col='left'
                      className='mono'
                      data-comment={`wrap-left-${key}`}
                      title='Left To Wrap'
                    >
                      {left}
                      {left !== item.qty ? ` / ${item.qty}` : ''}
                    </td>
                  ),
                  status: (
                    <td data-col='status' data-comment={`wrap-st-${key}`}>
                      <StatusPill status={item.status} comment={`wrap-stp-${key}`} />
                    </td>
                  ),
                  /* the cell holds orange from the moment a qty is entered and greens only when the
                     machine marks the reman Bent; a bypassed line never had a machine */
                  rem: (
                    <td data-col='rem' data-comment={`wrap-remc-${key}`}>
                      {lineRemans.length ? (
                        <span
                          className={`rework-badge ${lineRemans.every(reman => reman.bent) ? 'rework-done' : 'rework-pending'}`}
                          data-comment={`wrap-rembadge-${key}`}
                          title={`Remanufacture${lineRemans.every(reman => reman.bent) ? ' complete' : ' outstanding'}`}
                        >
                          <RefreshCw style={{ width: '14px', height: '14px' }} />
                          {lineRemans.reduce((sum, reman) => sum + reman.qty, 0)}
                        </span>
                      ) : order.bypassed ? (
                        <span
                          className='subtle'
                          data-comment={`wrap-remna-${key}`}
                          style={{ fontSize: '11px' }}
                          title='Bypassed orders skip production — Remanufacture N/A'
                        >
                          N/A
                        </span>
                      ) : (status === 'bent' || status === 'wrapped') && item.machineId ? (
                        <button
                          className='btn btn-sm btn-ghost rem-btn'
                          title='Remanufacture'
                          data-comment={`wrap-rem-${key}`}
                          onClick={() =>
                            openPad({
                              kind: 'reman',
                              source: 'wrapping',
                              orderId: order.id,
                              lineId: item.id
                            })
                          }
                        >
                          <RefreshCw style={{ width: '14px', height: '14px' }} />
                        </button>
                      ) : (
                        <span
                          className='subtle'
                          data-comment={`wrap-remnone-${key}`}
                          style={{ fontSize: '11px' }}
                          title='Available once the line is Bent'
                        >
                          —
                        </span>
                      )}
                    </td>
                  ),
                  wrapping: (
                    <td data-col='wrapping' data-comment={`wrap-wrapcell-${key}`}>
                      {status === 'wrapped' ? (
                        <span
                          className='subtle'
                          data-comment={`wrap-a-${key}`}
                          style={{ fontSize: '11px' }}
                        >
                          Wrapped ✓
                        </span>
                      ) : eligible ? (
                        <div className='wrap-qty-group' data-comment={`wrap-qtygrp-${key}`}>
                          <input
                            type='number'
                            className='field-input wrap-qty-input'
                            min='0'
                            max={left}
                            value={stagedQty(item) || ''}
                            placeholder='0'
                            data-comment={`wrap-qtyinput-${key}`}
                            title={`Qty to wrap (1–${left})`}
                            onClick={event => event.stopPropagation()}
                            onChange={event =>
                              setDraft(current => ({ ...current, [item.id]: event.target.value }))
                            }
                          />
                          {/* N-076/077: Auto Fill copies Left To Wrap, and is reversible */}
                          <button
                            className='btn btn-sm btn-ghost'
                            data-comment={`wrap-autofill-${key}`}
                            title={stagedQty(item) > 0 ? 'Clear' : `Auto Fill — all ${left}`}
                            onClick={() =>
                              setDraft(current => ({
                                ...current,
                                [item.id]: stagedQty(item) > 0 ? '' : String(left)
                              }))
                            }
                          >
                            {stagedQty(item) > 0 ? 'Clear' : 'Auto Fill'}
                          </button>
                        </div>
                      ) : (
                        <span
                          className='subtle'
                          data-comment={`wrap-a-${key}`}
                          style={{ fontSize: '11px' }}
                          title='N-075: needs Bent or Stock status'
                        >
                          <Ban style={{ width: '13px', height: '13px', verticalAlign: '-2px' }} />{' '}
                          Not eligible
                        </span>
                      )}
                    </td>
                  ),
                  notes: (
                    <td data-col='notes' data-comment={`wrap-act-${key}`}>
                      <div className='act-cell'>
                        <button
                          className={`note-btn ${noteState(item.notes) === 'unread' ? 'has-unread' : noteState(item.notes) === 'read' ? 'all-read' : ''}`}
                          data-comment={`wrap-note-${key}`}
                          title='Line notes'
                          onClick={() => openNotes({ orderId: order.id, lineId: item.id })}
                        >
                          <MessageSquare style={{ width: '14px', height: '14px' }} />
                          {noteState(item.notes) !== 'none' ? <span className='note-dot' /> : null}
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      <OrderInfoBlock
        order={order}
        prefix={`wrap-foot-${order.id}`}
        location={<LocationTags order={order} />}
      />

      <div className='pkgbuilder' data-comment={`wrap-pkgbuilder-${order.id}`}>
        <button
          className='btn'
          data-comment={`wrap-selectloc-${order.id}`}
          disabled={!canSelectLoc}
          onClick={() => openLocPicker(order.id, draftWeight)}
        >
          <MapPin style={{ width: '14px', height: '14px' }} />
          Select location{activeLoc ? ` · ${activeLoc.code}` : ''}
        </button>
        <button
          className='btn btn-primary'
          data-comment={`wrap-createprint-${order.id}`}
          disabled={!canCreate}
          onClick={print}
        >
          <Printer style={{ width: '14px', height: '14px' }} />
          Create &amp; print
        </button>

        {/* #189: the weight is read-only — it reports what the selected trims weigh, never typed in */}
        <span
          className={`weight-box${overLoc || overPkg ? ' over' : ''}`}
          data-comment={`wrap-weightbox-${order.id}`}
          title={
            overPkg
              ? `Over the ${maxPkg} lb package limit for Trim — split the package`
              : `Weight of the trims selected for this package${maxPkg > 0 ? ` · max ${maxPkg} lb` : ''}`
          }
        >
          <span className='weight-box-label' data-comment={`wrap-weightbox-label-${order.id}`}>
            Package Weight
          </span>
          <span className='weight-box-val mono' data-comment={`wrap-weightval-${order.id}`}>
            {draftWeight}
          </span>
          <span className='weight-box-unit' data-comment={`wrap-weightbox-unit-${order.id}`}>
            lb{maxPkg > 0 ? ` / ${maxPkg}` : ''}
          </span>
        </span>

        <div className='toolbar-spacer' />

        <button
          className='btn'
          data-comment={`wrap-seepkg2-${order.id}`}
          disabled={!packageCount}
          onClick={() => openPackages(order.id)}
          title={packageCount ? undefined : 'Available after the first package is printed'}
        >
          <Package style={{ width: '14px', height: '14px' }} />
          See packages{packageCount ? ` (${packageCount})` : ''}
        </button>
        <button
          className='btn btn-primary'
          data-comment={`wrap-complete2-${order.id}`}
          disabled={!canComplete}
          onClick={() =>
            askConfirm(
              `Complete order ${order.order}?`,
              'Are you sure you are done with this order and that you want to create a manufacturing batch for it?',
              () => {
                completeOrder(order.id)
                closeConfirm()
                showToast(
                  `Order ${order.order} complete · C_MFG batch (${batchQty} pcs) pushed to EBMS`
                )
              },
              'Yes, Create Manufacturing Batch',
              'No'
            )
          }
        >
          <Check style={{ width: '14px', height: '14px' }} />
          Order Complete
        </button>
      </div>
    </div>
  )
}
