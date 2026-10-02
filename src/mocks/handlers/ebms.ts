import { http, HttpResponse } from 'msw'
import { coilLots } from '../lib/coils'
import { paged, paramsOf } from '../lib/http'
import { batches } from '../lib/stock'
import { stamp } from '../lib/dates'
import { linesOfOrder, needOf, orders } from '../lib/world'
import { api } from '../url'

type Log = {
  id: number
  created_at: string
  method: string
  entity: string
  url: string
  request_body: unknown
  status_code: number | null
  response_body: string | null
  duration_ms: number
  error: string | null
}

const HOST = 'https://ebms.wiseline.test/api'

const logs: Log[] = []

const record = (
  daysAgo: number,
  hour: number,
  minute: number,
  entry: Pick<Log, 'method' | 'entity' | 'url' | 'request_body'> &
    Partial<Pick<Log, 'status_code' | 'response_body' | 'error'>>
) =>
  logs.push({
    id: logs.length + 1,
    created_at: stamp(daysAgo, hour, minute),
    status_code: 200,
    response_body: '{"value": "ok"}',
    error: null,
    duration_ms: 180 + ((logs.length * 37) % 420),
    ...entry
  })

// What the floor has pushed to EBMS lately: ship dates, manufactured quantities, batches and coils.
orders
  .filter(
    order => !order.is_stock && Object.values(order.states).some(state => state?.completed_at)
  )
  .slice(0, 8)
  .forEach((order, index) => {
    const day = index < 4 ? 0 : 1
    record(day, 8 + index, 10 + index * 3, {
      method: 'PATCH',
      entity: 'ARINV',
      url: `${HOST}/ARINV('${order.invoice}')`,
      request_body: { SHIP_DATE: order.ship_date }
    })
    for (const line of linesOfOrder(order).slice(0, 2)) {
      record(day, 8 + index, 14 + index * 3, {
        method: 'PATCH',
        entity: 'ARINVDET',
        url: `${HOST}/ARINVDET('${line.id}')`,
        request_body: { C_MFG: needOf(line) }
      })
    }
  })

for (const batch of batches) {
  record(1, 15, 5, {
    method: 'POST',
    entity: 'INMFG',
    url: `${HOST}/INMFG`,
    request_body: { MEMO: batch.order ?? 'Stock Manufacturing', DETAILS: batch.lines },
    status_code: 201,
    response_body: JSON.stringify({ BATCH: batch.ebms_batch })
  })
}

coilLots.slice(0, 3).forEach((lot, index) => {
  record(0, 10 + index, 40, {
    method: 'PATCH',
    entity: 'INLOTS',
    url: `${HOST}/INLOTS('${lot.lot_number}')`,
    request_body: { LINEAR_FT: lot.linear_feet }
  })
})

// The two ways a call fails: EBMS refuses it, or never answers.
record(0, 11, 22, {
  method: 'POST',
  entity: 'INMFG',
  url: `${HOST}/INMFG`,
  request_body: {
    MEMO: 'Stock Manufacturing',
    DETAILS: [{ INVEN: 'RIDGE-FLAT-26-GLV', QUAN: 40 }]
  },
  status_code: 409,
  response_body: '{"error": "Warehouse MFG is locked for inventory count."}'
})
record(0, 13, 5, {
  method: 'PATCH',
  entity: 'INLOTS',
  url: `${HOST}/INLOTS('26-0455')`,
  request_body: { LINEAR_FT: 2610 },
  status_code: null,
  response_body: null,
  error: 'Timeout: read timed out after 30s'
})

const failed = (log: Log) => log.error !== null || (log.status_code ?? 0) >= 400

export const ebmsHandlers = [
  http.get(api('ebms-logs/'), ({ request }) => {
    const params = paramsOf(request)
    const outcome = params.get('outcome')
    const search = params.get('search')?.toLowerCase()
    const since = params.get('date_from')
    const rows = logs
      .filter(log => !outcome || (outcome === 'failed') === failed(log))
      .filter(log => !since || log.created_at >= new Date(`${since}T00:00`).toISOString())
      .filter(
        log =>
          !search ||
          [log.url, JSON.stringify(log.request_body), log.response_body ?? ''].some(text =>
            text.toLowerCase().includes(search)
          )
      )
      .toSorted((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
    return HttpResponse.json(paged(request, rows))
  })
]
