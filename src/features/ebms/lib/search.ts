import * as z from 'zod/mini'

// A stray `?status=` opens the refused writes, the ones that need a person.
export const ebmsSearchSchema = z.object({
  status: z.catch(z._default(z.enum(['failed', 'queued', 'ok']), 'failed'), 'failed')
})
