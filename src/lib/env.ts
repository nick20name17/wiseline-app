import * as z from 'zod/mini'

const envSchema = z.object({
  VITE_API_URL: z.url()
})

// A review build talks to the mock and nothing else, whatever address the hub's project settings
// still carry from earlier builds.
const REVIEW_API_URL = 'https://api.review.test/'

const parsed = envSchema.safeParse({
  VITE_API_URL: import.meta.env.VITE_REVIEW ? REVIEW_API_URL : import.meta.env.VITE_API_URL
})

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`)
}

export const env = parsed.data
