import * as z from 'zod/mini'

const envSchema = z.object({
  // trailing slash required: ky resolves endpoints via `new URL(path, baseUrl)`, which drops a base's last segment without it
  VITE_API_URL: z._default(z.string().check(z.minLength(1)), '/api/'),
  VITE_ENABLE_MOCKS: z._default(z.enum(['true', 'false']), 'true')
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(z.treeifyError(parsed.error), null, 2)}`
  )
}

export const env = parsed.data

// dev-only mock backend; see src/mocks/mock-server.ts
export const mocksEnabled = import.meta.env.DEV && env.VITE_ENABLE_MOCKS === 'true'
