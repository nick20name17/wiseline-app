import { HttpResponse } from 'msw'

export const notFound = () => new HttpResponse(null, { status: 404 })

/** The server words a refusal as `{ detail }`, which the client shows under the mutation's title. */
export const refuse = (detail: string, status = 400) => HttpResponse.json({ detail }, { status })

export const paramsOf = (request: Request) => new URL(request.url).searchParams

export const paged = <T>(request: Request, rows: T[]) => {
  const params = paramsOf(request)
  const offset = Number(params.get('offset') ?? 0)
  const limit = Number(params.get('limit') ?? rows.length)
  return { count: rows.length, results: rows.slice(offset, offset + limit) }
}

export const bodyOf = async <T>(request: Request) => (await request.json().catch(() => ({}))) as T

export const nextId = (rows: { id: number }[]) => Math.max(0, ...rows.map(row => row.id)) + 1
