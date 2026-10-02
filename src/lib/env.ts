import * as z from 'zod/mini'

const envSchema = z.object({
  VITE_API_URL: z.url()
})

// The hub builds a review with nothing but `VITE_REVIEW` set, and the mock answers any address.
const REVIEW_API_URL = 'https://api.review.test/'

const parsed = envSchema.safeParse({
  VITE_API_URL:
    import.meta.env.VITE_API_URL ?? (import.meta.env.VITE_REVIEW ? REVIEW_API_URL : undefined)
})

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`)
}

export const env = parsed.data
