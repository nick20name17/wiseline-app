import { Check, Trash2, Upload } from 'lucide-react'

import { useState } from 'react'

import { useStore } from '@/store/create-store'

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

/**
 * The other half of Production's mode switch: extra pieces the floor made that no order asked for,
 * typed straight in and pushed to EBMS as a C_MFG batch. The grid grows a row as soon as the last one
 * is touched, so there is never a visible «add row» to hunt for.
 */
export const StockMfg = () => {
  const stockBatches = useStore(trimStore, state => state.stockBatches as StockBatch[])
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
              <th style={{ width: '90px' }}>Qty</th>
              <th style={{ width: '170px' }}>Product ID</th>
              <th>Description</th>
              <th style={{ width: '44px' }} />
            </tr>
          </thead>
          <tbody data-comment='smfg-tbody'>
            {rows.map((row, index) => (
              <tr key={index} data-comment={`smfg-row-${index}`}>
                <td>
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
                <td>
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
                <td>
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
                <tr>
                  <th style={{ width: '90px' }}>Time</th>
                  <th style={{ width: '130px' }}>Product ID</th>
                  <th>Description</th>
                  <th style={{ width: '70px' }}>Qty</th>
                  <th style={{ width: '120px' }}>EBMS</th>
                </tr>
              </thead>
              <tbody data-comment='smfg-hist-tbody'>
                {stockBatches.map((batch, index) => (
                  <tr key={index} data-comment={`smfg-hrow-${index}`}>
                    <td className='mono muted' data-comment={`smfg-htime-${index}`}>
                      {batch.ts}
                    </td>
                    <td className='mono' data-comment={`smfg-hpid-${index}`}>
                      {batch.pid}
                    </td>
                    <td className='trunc' data-comment={`smfg-hdesc-${index}`}>
                      {batch.desc}
                    </td>
                    <td className='mono' data-comment={`smfg-hqty-${index}`}>
                      {batch.qty}
                    </td>
                    <td data-comment={`smfg-hebms-${index}`}>
                      <span className='status st-wrapped'>
                        <Check style={{ width: '14px', height: '14px' }} />
                        C_MFG
                      </span>
                    </td>
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
