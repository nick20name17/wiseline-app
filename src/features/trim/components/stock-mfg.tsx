import { Check, Trash2, Upload } from 'lucide-react'

import { useState } from 'react'

import { useStore } from '@/store/create-store'

import { useColumnOrder, type Column } from '@/components/shell/column-order'

import { PRODUCT_CATALOG } from '../catalog'
import { createManufacturingBatch, trimStore } from '../store'
import { askConfirm, closeConfirm, showToast } from '../ui'

type SmfgRow = { qty: string; pid: string; desc: string }

const BLANK: SmfgRow = { qty: '', pid: '', desc: '' }

const isBlank = (row: SmfgRow) => !row.qty.trim() && !row.pid.trim() && !row.desc.trim()

const validRows = (rows: SmfgRow[]) =>
  rows
    .map(row => ({ qty: parseInt(row.qty, 10), pid: row.pid.trim(), desc: row.desc.trim() }))
    .filter(row => row.pid && row.qty > 0)

type StockBatch = { ts: string; pid: string; desc: string; qty: number }

/** N-166/#114: both grids here move their columns; the delete button is a service column and stays. */
const ENTRY_COLUMNS: Column[] = [
  { key: 'qty', label: 'Qty', width: '90px' },
  { key: 'pid', label: 'Product ID', width: '170px' },
  { key: 'desc', label: 'Description' }
]

const HISTORY_COLUMNS: Column[] = [
  { key: 'time', label: 'Time', width: '90px' },
  { key: 'pid', label: 'Product ID', width: '130px' },
  { key: 'desc', label: 'Description' },
  { key: 'qty', label: 'Qty', width: '70px' },
  { key: 'ebms', label: 'EBMS', width: '120px' }
]

/**
 * The other half of Production's mode switch: extra pieces the floor made that no order asked for,
 * typed straight in and pushed to EBMS as a C_MFG batch. The grid grows a row as soon as the last one
 * is touched, so there is never a visible «add row» to hunt for.
 */
export const StockMfg = () => {
  const stockBatches = useStore(trimStore, state => state.stockBatches as StockBatch[])
  const entry = useColumnOrder('trim-smfg', ENTRY_COLUMNS, { notify: showToast })
  const history = useColumnOrder('trim-smfg-hist', HISTORY_COLUMNS, { notify: showToast })
  const [rows, setRows] = useState<SmfgRow[]>([{ ...BLANK }])

  const valid = validRows(rows)
  const pieces = valid.reduce((sum, row) => sum + row.qty, 0)

  const edit = (index: number, field: keyof SmfgRow, value: string) =>
    setRows(current => {
      const next = current.map((row, at) => (at === index ? { ...row, [field]: value } : row))

      // same as the Create Stock Order modal: a known Product ID writes its own description
      if (field === 'pid') {
        const hit = PRODUCT_CATALOG[value.trim().toUpperCase()]
        if (hit) next[index] = { ...next[index]!, desc: hit }
      }

      // touching the last row is what asks for another one
      if (index === current.length - 1 && !isBlank(next[index]!)) next.push({ ...BLANK })
      return next
    })

  const push = () => {
    if (!valid.length) return
    const plural = valid.length > 1 ? 's' : ''

    askConfirm(
      'Create manufacturing batch?',
      `Pushes ${valid.length} stock item${plural} (${pieces} pcs) to EBMS via C_MFG.`,
      () => {
        closeConfirm()
        createManufacturingBatch(valid)
        setRows([{ ...BLANK }])
        showToast(
          `${valid.length} stock item${plural} → manufacturing batch (${pieces} pcs) pushed to EBMS (C_MFG)`
        )
      },
      'Create Batch'
    )
  }

  const remove = (index: number) =>
    setRows(current => {
      const next = current.filter((_, at) => at !== index)
      return next.length ? next : [{ ...BLANK }]
    })

  return (
    <>
      <div className='toolbar' data-comment='smfg-toolbar'>
        <span className='toolbar-info' data-comment='smfg-count'>
          {valid.length ? (
            <>
              <b>{valid.length}</b> item{valid.length !== 1 ? 's' : ''} · <b>{pieces}</b> pcs
            </>
          ) : (
            'Enter the extra pieces you made'
          )}
        </span>
        <div className='toolbar-spacer' />
        <button
          className='btn btn-primary'
          data-comment='smfg-createbatch'
          disabled={!valid.length}
          onClick={push}
        >
          <Upload style={{ width: '14px', height: '14px' }} />
          Create Manufacturing Batch
        </button>
      </div>

      <div className='table-wrap' data-comment='smfg-wrap'>
        <table className='grid' data-comment='smfg-table'>
          <thead>
            <tr>
              {entry.headers}
              <th style={{ width: '44px' }} />
            </tr>
          </thead>
          <tbody data-comment='smfg-tbody'>
            {rows.map((row, index) => (
              <tr key={index} data-comment={`smfg-row-${index}`}>
                {entry.cells({
                  qty: (
                    <td data-col='qty'>
                      <input
                        className='field-input mono'
                        style={{ width: '100%' }}
                        type='number'
                        min='1'
                        value={row.qty}
                        placeholder='0'
                        data-comment={`smfg-qty-${index}`}
                        onChange={event => edit(index, 'qty', event.target.value)}
                      />
                    </td>
                  ),
                  pid: (
                    <td data-col='pid'>
                      <input
                        className='field-input mono'
                        style={{ width: '100%' }}
                        type='text'
                        value={row.pid}
                        placeholder='TSWB262'
                        data-comment={`smfg-pid-${index}`}
                        onChange={event => edit(index, 'pid', event.target.value)}
                      />
                    </td>
                  ),
                  desc: (
                    <td data-col='desc'>
                      <input
                        className='field-input'
                        type='text'
                        style={{ width: '100%' }}
                        value={row.desc}
                        placeholder='Auto-fills from Product ID'
                        data-comment={`smfg-desc-${index}`}
                        onChange={event => edit(index, 'desc', event.target.value)}
                      />
                    </td>
                  )
                })}
                <td>
                  {rows.length > 1 ? (
                    <button
                      className='stock-del'
                      data-comment={`smfg-del-${index}`}
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
      </div>

      {stockBatches.length ? (
        <>
          <div className='subhead' data-comment='smfg-hist-subhead'>
            <span className='subhead-title' data-comment='smfg-hist-title'>
              Manufacturing batches pushed to EBMS
            </span>
          </div>
          <div className='table-wrap' data-comment='smfg-hist-wrap'>
            <table className='grid' data-comment='smfg-hist-table'>
              <thead>
                <tr>{history.headers}</tr>
              </thead>
              <tbody data-comment='smfg-hist-tbody'>
                {stockBatches.map((batch, index) => (
                  <tr key={index} data-comment={`smfg-hrow-${index}`}>
                    {history.cells({
                      time: (
                        <td
                          data-col='time'
                          className='mono muted'
                          data-comment={`smfg-htime-${index}`}
                        >
                          {batch.ts}
                        </td>
                      ),
                      pid: (
                        <td data-col='pid' className='mono' data-comment={`smfg-hpid-${index}`}>
                          {batch.pid}
                        </td>
                      ),
                      desc: (
                        <td data-col='desc' className='trunc' data-comment={`smfg-hdesc-${index}`}>
                          {batch.desc}
                        </td>
                      ),
                      qty: (
                        <td data-col='qty' className='mono' data-comment={`smfg-hqty-${index}`}>
                          {batch.qty}
                        </td>
                      ),
                      ebms: (
                        <td data-col='ebms' data-comment={`smfg-hebms-${index}`}>
                          <span className='status st-wrapped'>
                            <Check style={{ width: '14px', height: '14px' }} />
                            C_MFG
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  )
}
