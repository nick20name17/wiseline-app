import { http, HttpResponse } from 'msw'
import { nextId } from '../lib/http'
import { priorities, type SeedPriority } from '../seed/priorities'
import { api } from '../url'

type Form = Pick<SeedPriority, 'name' | 'color' | 'department'> & {
  position?: number
}

export const prioritiesHandlers = [
  http.get(api('priorities/'), () => HttpResponse.json(priorities)),
  // Registered before `:id/` so `reorder` is not read as an id.
  http.post(api('priorities/reorder/'), async ({ request }) => {
    const { ids } = (await request.json()) as {
      department: number | null
      ids: number[]
    }
    ids.forEach((id, index) => {
      const priority = priorities.find(row => row.id === id)
      if (priority) priority.position = index + 1
    })
    return HttpResponse.json({ ids })
  }),
  http.post(api('priorities/'), async ({ request }) => {
    const form = (await request.json()) as Form
    const last = Math.max(
      0,
      ...priorities.filter(row => row.department === form.department).map(row => row.position)
    )
    const priority = {
      ...form,
      id: nextId(priorities),
      position: form.position ?? last + 1
    }
    priorities.push(priority)
    return HttpResponse.json(priority, { status: 201 })
  }),
  http.patch(api('priorities/:id/'), async ({ params, request }) => {
    const priority = priorities.find(row => row.id === Number(params.id))
    if (!priority) return new HttpResponse(null, { status: 404 })
    Object.assign(priority, await request.json())
    return HttpResponse.json(priority)
  }),
  http.delete(api('priorities/:id/'), ({ params }) => {
    const at = priorities.findIndex(row => row.id === Number(params.id))
    if (at !== -1) priorities.splice(at, 1)
    return new HttpResponse(null, { status: 204 })
  })
]
