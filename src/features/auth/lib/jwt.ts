import * as z from 'zod/mini'

// The API has no `me` endpoint: the only way to the current user is the id inside the access
// token, fed to GET /users/{id}/. fastapi-users writes it as `sub`, this deployment as `user_id`.
const claimsSchema = z.object({
  sub: z.optional(z.union([z.string(), z.number()])),
  user_id: z.optional(z.union([z.string(), z.number()]))
})

const decodePayload = (token: string) => {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return claimsSchema.safeParse(JSON.parse(json)).data ?? null
  } catch {
    return null
  }
}

export const userIdFromToken = (token: string) => {
  const claims = decodePayload(token)
  const raw = claims?.user_id ?? claims?.sub
  if (raw === undefined) return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}
