import { useEffect, useRef, useState } from 'react'
import { QrCode, Trash2 } from 'lucide-react'

import { useColumnOrder, type Column } from '@/components/shell/column-order'
import { ModalHead, Overlay } from '@/components/shell/modal'

import { PRODUCT_CATALOG } from '../catalog'
import { createStockOrder } from '../store'
import { showToast } from '../ui'

type Row = { qty: string; pid: string; desc: string }

const BLANK: Row = { qty: '', pid: '', desc: '' }

const isBlank = (row: Row) => !row.qty && !row.pid && !row.desc

/** Demo cards for the Simulate scan button — the real scanner sends the same payload shape. */
const MOCK_STOCK_CARDS = [
  { pid: 'TSWB262', qty: 40 },
  { pid: 'TDRIP24', qty: 60 },
  { pid: 'TRIDGE26', qty: 30 },
  { pid: 'TGABLE26', qty: 50 },
  { pid: 'TVAL26', qty: 24 },
  { pid: 'TCORN26', qty: 36 }
]

/**
 * N-183: an internal order, built by scanning stock cards or by typing.
 *
 * There is no «Add row» and no «Scan» button. Typing into the last line spawns the next one, and the
 * scanner is live the whole time the modal is open — a worker holding a scanner in one hand should not
 * have to click anything with the other.
 */
/** N-166/#114 — the heads keep the anchors they already carry; the delete column is a service one. */
const DATA_COLUMNS: Column[] = [
  { key: 'qty', label: 'Qty', width: '90px', comment: 'stock-th-qty' },
  { key: 'pid', label: 'Product ID', width: '150px', comment: 'stock-th-pid' },
  { key: 'desc', label: 'Description', comment: 'stock-th-desc' }
]

export const StockOrderModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [rows, setRows] = useState<Row[]>([BLANK])
  const { headers, cells } = useColumnOrder('trim-stockorder', DATA_COLUMNS, { notify: showToast })
  const [error, setError] = useState('')
  const scanSeq = useRef(0)

  const edit = (index: number, field: keyof Row, value: string) =>
    setRows(current => {
      const next = current.map((row, at) => (at === index ? { ...row, [field]: value } : row))

      // a Product ID that the catalogue knows fills its own description
      if (field === 'pid') {
        const hit = PRODUCT_CATALOG[value.trim().toUpperCase()]
        if (hit) next[index] = { ...next[index]!, desc: hit }
      }

      // typing into the last line is what grows the table
      if (index === next.length - 1 && !isBlank(next[index]!)) next.push(BLANK)
      return next
    })

  const remove = (index: number) =>
    setRows(current => {
      const next = current.filter((_, at) => at !== index)
      return next.length ? next : [BLANK]
    })

  const applyScan = (payload: string) => {
    const match = /^(?:WL-STOCK-)?([A-Z0-9]+)(?:[*, ](\d+))?$/i.exec(payload.trim())
    const pid = match ? match[1]!.toUpperCase() : ''

    if (!pid || !PRODUCT_CATALOG[pid])
      return showToast('Unrecognized Stock Card QR — enter the line manually', 'error')

    const known = MOCK_STOCK_CARDS.find(card => card.pid === pid)
    const scanned: Row = {
      qty: String((match?.[2] && Number.parseInt(match[2], 10)) || known?.qty || 1),
      pid,
      desc: PRODUCT_CATALOG[pid]!
    }

    setRows(current => {
      const at = current.findIndex(isBlank)
      const next =
        at >= 0
          ? current.map((row, index) => (index === at ? scanned : row))
          : [...current, scanned]

      // a scan into the middle can leave two blanks at the end; keep exactly one to type into
      while (next.length > 1 && isBlank(next[next.length - 1]!) && isBlank(next[next.length - 2]!))
        next.pop()
      if (!next.some(isBlank)) next.push(BLANK)
      return next
    })

    setError('')
    showToast(`Scanned Stock Card · ${scanned.pid} × ${scanned.qty}`, 'info')
  }

  /**
   * A handheld QR scanner is a keyboard wedge: it types its payload in a burst and ends with Enter,
   * so a run of keystrokes under 50ms apart followed by Enter is a scan rather than someone typing.
   * The wedge also types into whatever field has focus, which is why the burst is swallowed here
   * instead of being left in the row it landed in.
   */
  useEffect(() => {
    if (!open) return

    let buffer = ''
    let lastKey = 0

    const onKeyDown = (event: KeyboardEvent) => {
      const now = Date.now()
      if (now - lastKey > 50) buffer = ''
      lastKey = now

      if (event.key === 'Enter') {
        const payload = buffer
        buffer = ''
        // the 50ms gap already rules out human typing, so this floor only excludes a stray keystroke
        if (payload.length < 3) return

        event.preventDefault()
        applyScan(payload)
        return
      }

      if (event.key.length === 1) buffer += event.key
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const submit = () => {
    const filled = rows
      .map(row => ({
        qty: Number.parseInt(row.qty, 10),
        pid: row.pid.trim(),
        desc: row.desc.trim()
      }))
      .filter(row => row.pid || row.qty || row.desc)

    if (!filled.length) return setError('Add at least one line item.')
    for (const row of filled) {
      if (!row.qty || row.qty < 1) return setError('Every row needs a quantity of 1 or more.')
      if (!row.pid) return setError('Every row needs a Product ID.')
    }

    setError('')
    const number = createStockOrder(filled.map(row => ({ ...row, desc: row.desc || '—' })))
    showToast(`Stock order ${number} created`)
    setRows([BLANK])
    onClose()
  }

  return (
    <Overlay id='overlay-stock' comment='overlay-stock' open={open} onClose={onClose}>
      <div className='modal wide' data-comment='stock-modal' data-component='dialog'>
        <ModalHead
          comment='stock-head'
          titleComment='stock-title'
          descComment='stock-desc'
          title='Create stock order'
          desc='Internal order — no EBMS source, no ship date or order notes.'
          onClose={onClose}
        />
        <div className='modal-body' data-comment='stock-body'>
          <table className='stock-edit' data-comment='stock-edit-table'>
            <thead data-comment='stock-edit-thead'>
              <tr data-comment='stock-edit-headrow'>
                {headers}
                <th data-comment='stock-th-act' style={{ width: '40px' }} />
              </tr>
            </thead>
            <tbody id='stock-rows' data-comment='stock-edit-rows'>
              {rows.map((row, index) => (
                <tr data-comment={`stock-row-${index}`} key={index}>
                  {cells({
                    qty: (
                      <td data-col='qty'>
                        <input
                          type='number'
                          min='1'
                          className='mono'
                          value={row.qty}
                          data-comment={`stock-qty-${index}`}
                          placeholder='0'
                          onChange={event => edit(index, 'qty', event.target.value)}
                        />
                      </td>
                    ),
                    pid: (
                      <td data-col='pid'>
                        <input
                          type='text'
                          className='mono'
                          value={row.pid}
                          data-comment={`stock-pid-${index}`}
                          placeholder='TSWB262'
                          onChange={event => edit(index, 'pid', event.target.value)}
                        />
                      </td>
                    ),
                    desc: (
                      <td data-col='desc'>
                        <input
                          type='text'
                          value={row.desc}
                          data-comment={`stock-desc-${index}`}
                          placeholder='Auto-fills from Product ID'
                          onChange={event => edit(index, 'desc', event.target.value)}
                        />
                      </td>
                    )
                  })}
                  <td>
                    {/* the trailing blank row is the grow-row — there is nothing to delete there */}
                    {index < rows.length - 1 ? (
                      <button
                        className='stock-del'
                        data-comment={`stock-del-${index}`}
                        onClick={() => remove(index)}
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className='scan-live' data-comment='stock-scan-live'>
            <span className='scan-live-dot' data-comment='stock-scan-dot' />
            <span data-comment='stock-scan-text'>
              Scanner live — scan a Stock Card QR any time to fill the next empty line.
            </span>
            <button
              className='scan-sim'
              data-comment='stock-scan-sim'
              title='Demo only — no scanner attached in this preview'
              onClick={() => {
                const card = MOCK_STOCK_CARDS[scanSeq.current % MOCK_STOCK_CARDS.length]!
                scanSeq.current += 1
                applyScan(`WL-STOCK-${card.pid}*${card.qty}`)
              }}
            >
              <QrCode style={{ width: '12px', height: '12px' }} />
              Simulate scan
            </button>
          </div>

          <div
            className='error-message'
            id='stock-error'
            data-comment='stock-error'
            data-component='alert'
            style={{
              display: error ? 'block' : 'none',
              marginTop: '12px',
              padding: '10px 12px',
              background: 'var(--danger-soft)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--danger)',
              fontSize: '12px'
            }}
          >
            {error}
          </div>
        </div>
        <div className='modal-foot' data-comment='stock-foot'>
          <button className='btn btn-ghost' data-comment='stock-cancel' onClick={onClose}>
            Cancel
          </button>
          <button className='btn btn-primary' data-comment='stock-create' onClick={submit}>
            Create order
          </button>
        </div>
      </div>
    </Overlay>
  )
}
