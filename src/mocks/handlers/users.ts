import { http, HttpResponse } from 'msw'
import { nextId } from '../lib/http'
import { users, type SeedUser } from '../seed/users'
import { api } from '../url'

const matches = (user: SeedUser, search: string | null) =>
  !search ||
  `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(search.toLowerCase())

export const usersHandlers = [
  http.get(api('users/'), ({ request }) => {
    const search = new URL(request.url).searchParams.get('search')
    const results = users.filter(user => matches(user, search))
    return HttpResponse.json({ count: results.length, results })
  }),
  http.get(api('users/:id/'), ({ params }) => {
    const user = users.find(row => row.id === Number(params.id))
    return user ? HttpResponse.json(user) : new HttpResponse(null, { status: 404 })
  }),
  http.post(api('users/'), async ({ request }) => {
    const { password: _password, ...body } = (await request.json()) as Omit<
      SeedUser,
      'id' | 'is_active'
    > & { password?: string }
    const user = {
      ...body,
      id: nextId(users),
      is_active: true
    }
    users.push(user)
    return HttpResponse.json(user, { status: 201 })
  }),
  http.patch(api('users/:id/'), async ({ params, request }) => {
    const user = users.find(row => row.id === Number(params.id))
    if (!user) return new HttpResponse(null, { status: 404 })
    Object.assign(user, await request.json())
    return HttpResponse.json(user)
  }),
  http.delete(api('users/:id/'), ({ params }) => {
    const at = users.findIndex(row => row.id === Number(params.id))
    if (at !== -1) users.splice(at, 1)
    return new HttpResponse(null, { status: 204 })
  })
]
