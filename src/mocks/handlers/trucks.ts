import { http, HttpResponse } from 'msw'
import { nextId } from '../lib/http'
import { trucks, type SeedTruck } from '../seed/trucks'
import { api } from '../url'

export const trucksHandlers = [
  http.get(api('trucks/'), ({ request }) => {
    const search = new URL(request.url).searchParams.get('search')?.toLowerCase()
    return HttpResponse.json(
      trucks.filter(truck => !search || truck.name.toLowerCase().includes(search))
    )
  }),
  http.post(api('trucks/'), async ({ request }) => {
    const truck = {
      ...((await request.json()) as Omit<SeedTruck, 'id'>),
      id: nextId(trucks)
    }
    trucks.push(truck)
    return HttpResponse.json(truck, { status: 201 })
  }),
  http.patch(api('trucks/:id/'), async ({ params, request }) => {
    const truck = trucks.find(row => row.id === Number(params.id))
    if (!truck) return new HttpResponse(null, { status: 404 })
    Object.assign(truck, await request.json())
    return HttpResponse.json(truck)
  }),
  http.delete(api('trucks/:id/'), ({ params }) => {
    const at = trucks.findIndex(row => row.id === Number(params.id))
    if (at !== -1) trucks.splice(at, 1)
    return new HttpResponse(null, { status: 204 })
  })
]
