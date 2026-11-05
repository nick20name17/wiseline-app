import { authApi } from '@/api/client'
import { keepPreviousData, queryOptions, useMutation } from '@tanstack/react-query'
import * as z from 'zod/mini'

/** Where a write stands: still waiting for EBMS, refused by it, or sent once it answered. */
export type OutboxStatus = 'failed' | 'queued' | 'ok'

const ebmsKeys = {
  all: ['ebms-outbox'] as const,
  list: (status: OutboxStatus, page: number) => [...ebmsKeys.all, 'list', status, page] as const,
  count: (status: OutboxStatus) => [...ebmsKeys.all, 'count', status] as const
}

const writeSchema = z.object({
  id: z.number(),
  created_at: z._default(z.nullable(z.string()), null),
  // order_complete, coil_adjust, coil_deplete, ship_date — and whatever the server adds next.
  kind: z._default(z.string(), ''),
  // What went to EBMS, in EBMS's own fields: SHIP_DATE, LOT_COUNT.
  body: z.catch(z.record(z.string(), z.unknown()), {}),
  order: z._default(z.nullable(z.string()), null),
  order_number: z._default(z.nullable(z.string()), null),
  lot_autoid: z._default(z.nullable(z.string()), null),
  lot_number: z._default(z.nullable(z.string()), null),
  coil: z._default(
    z.nullable(
      z.object({
        product_id: z._default(z.nullable(z.string()), null),
        color: z._default(z.nullable(z.string()), null),
        gauge: z._default(z.nullable(z.number()), null),
        width: z._default(z.nullable(z.number()), null)
      })
    ),
    null
  ),
  // `null` for a write a task made, the Ship Date's.
  created_by: z._default(z.nullable(z.string()), null),
  status: z._default(z.string(), ''),
  attempts: z._default(z.number(), 0),
  next_attempt_at: z._default(z.nullable(z.string()), null),
  sent_at: z._default(z.nullable(z.string()), null),
  last_error: z._default(z.nullable(z.string()), null)
})

export type OutboxWrite = z.infer<typeof writeSchema>

const pageSchema = z.object({
  count: z._default(z.number(), 0),
  results: z._default(z.array(writeSchema), [])
})

export const OUTBOX_PAGE = 50

const readPage = async (status: OutboxStatus, limit: number, offset: number) =>
  pageSchema.parse(
    await authApi.get('ebms-outbox/', { searchParams: { status, limit, offset } }).json()
  )

/** The writes in one state, newest first, a page at a time; `page` is zero-based. */
export const outboxQuery = (status: OutboxStatus, page: number) =>
  queryOptions({
    queryKey: ebmsKeys.list(status, page),
    placeholderData: keepPreviousData,
    queryFn: () => readPage(status, OUTBOX_PAGE, page * OUTBOX_PAGE)
  })

/** How many writes are in a state: a tab's count, whichever tab is open. */
export const outboxCountQuery = (status: OutboxStatus) =>
  queryOptions({
    queryKey: ebmsKeys.count(status),
    queryFn: async () => (await readPage(status, 1, 0)).count
  })

/**
 * A refused write sent once more, after whatever EBMS objected to is fixed there. Resolves to how it
 * went: `ok`, `queued` (EBMS not answering) or `failed` again.
 */
export const useRetryWrite = () =>
  useMutation({
    meta: { errorTitle: 'Not sent to EBMS again' },
    mutationFn: async (id: number) =>
      writeSchema.parse(await authApi.post(`ebms-outbox/${id}/retry/`).json()),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: ebmsKeys.all })
  })
