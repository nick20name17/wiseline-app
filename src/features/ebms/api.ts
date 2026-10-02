import { authApi } from '@/api/client'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as z from 'zod/mini'

const logSchema = z.object({
  id: z.number(),
  created_at: z._default(z.nullable(z.string()), null),
  method: z.string(),
  // The EBMS table the call touched: ARINV, ARINVDET, INMFG, INLOTS.
  entity: z._default(z.nullable(z.string()), null),
  url: z.string(),
  request_body: z._default(z.nullable(z.unknown()), null),
  status_code: z._default(z.nullable(z.number()), null),
  response_body: z._default(z.nullable(z.string()), null),
  duration_ms: z._default(z.nullable(z.number()), null),
  // Set when EBMS never answered: a timeout or a refused connection.
  error: z._default(z.nullable(z.string()), null)
})

export type EbmsLog = z.infer<typeof logSchema>

const pageSchema = z.object({ count: z.number(), results: z.array(logSchema) })

export type Outcome = 'ok' | 'failed'

/** Refused (4xx/5xx) or never answered — the server's own `outcome=failed`. */
export const isFailed = (log: EbmsLog) => log.error !== null || (log.status_code ?? 0) >= 400

const PAGE_SIZE = 50

type LogFilters = { outcome?: Outcome; search?: string; since?: string; limit?: number }

export const ebmsLogsQuery = ({ outcome, search, since, limit = PAGE_SIZE }: LogFilters) =>
  queryOptions({
    queryKey: ['ebms-logs', { outcome, search, since, limit }] as const,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      pageSchema.parse(
        await authApi
          .get('ebms-logs/', {
            searchParams: {
              limit,
              ...(outcome ? { outcome } : {}),
              ...(search ? { search } : {}),
              ...(since ? { date_from: since } : {})
            }
          })
          .json()
      )
  })
