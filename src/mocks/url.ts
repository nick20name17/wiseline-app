import { env } from '@/lib/env'

/** MSW matches absolute URLs, so every handler is rooted at the API base the client already uses. */
export const api = (path: string) => new URL(path, env.VITE_API_URL).href
